module Scoreboard
  class SseController < ApplicationController
    include ActionController::Live

    def stream
      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["X-Accel-Buffering"] = "no"

      queue = Thread::Queue.new
      event_log = Scoreboard::EventLog.instance
      subscriptions = nil
      heartbeat = nil

      subscriptions = Scoreboard::SseSubscriptions.new(queue)
      subscriptions.subscribe_all # ← 先に購読登録（新イベントはキューへ）

      last_id = request.headers["Last-Event-ID"]&.to_i
      replay_upper_bound = nil # nil 初期化。replay を実行した接続のみ値を設定する

      if last_id&.positive?
        replay_upper_bound = event_log.current_max_id # ← subscribe後にスナップショット取得
        entries = event_log.events_after(last_id)
        if entries.nil?
          # 欠損が多すぎて再送不能 → クライアントに再同期を指示して終了
          Scoreboard::SseWriter.write(response.stream, "resync_required", {})
          return
        end
        # replay は (last_id, replay_upper_bound] のみ送信
        entries.each do |entry|
          break if entry.id > replay_upper_bound
          Scoreboard::SseWriter.write(response.stream, entry.event, entry.data, id: entry.id)
        end
      end

      heartbeat = start_heartbeat(queue)

      loop do
        msg = queue.pop
        # replay が走った接続のみ重複排除（初回接続は replay_upper_bound が nil のため素通り）
        next if replay_upper_bound && msg[:id] && msg[:id] <= replay_upper_bound
        Scoreboard::SseWriter.write(response.stream, msg[:event], msg[:data], id: msg[:id])
      end
    rescue ActionController::Live::ClientDisconnected, IOError
      # クライアント切断
    ensure
      heartbeat&.kill
      subscriptions&.unsubscribe_all
      response.stream.close
    end

    private

    def start_heartbeat(queue)
      Thread.new do
        loop do
          sleep(15)
          queue.push({ event: "heartbeat", data: {} })
        end
      end
    end
  end
end

module Scoreboard
  # スコアボード通知をグローバルに購読し、EventLog へ1回だけ記録して
  # 全接続キューへ配信するブロードキャスタ。
  # 接続が0件の間もイベントを記録し続けるため、Last-Event-ID による再送が正確に機能する。
  class EventBroadcaster
    INSTANCE_MUTEX = Mutex.new
    private_constant :INSTANCE_MUTEX

    # payload[:payload] を SSE データとして流すイベント
    WITH_PAYLOAD = {
      "scoreboard.update" => "match_update",
      "scoreboard.match_init" => "match_init",
      "scoreboard.question_show" => "question_show",
      "scoreboard.timer_init" => "timer_init",
      "scoreboard.timer_set_remaining_time" => "timer_set_remaining_time",
      "scoreboard.first_place_display_player" => "first_place_display_player",
      "scoreboard.paper_seed_init" => "paper_seed_init",
      "scoreboard.paper_seed_display_player" => "paper_seed_display_player",
      "scoreboard.round2_announcement_init" => "round2_announcement_init",
      "scoreboard.round2_announcement_display_player" => "round2_announcement_display_player",
      "scoreboard.round2_announcement_display_all_players" => "round2_announcement_display_all_players",
      "scoreboard.announcement" => "announcement",
      "scoreboard.champion" => "champion",
    }.freeze

    # payload なし（空ハッシュを送信）のイベント
    WITHOUT_PAYLOAD = {
      "scoreboard.show_scores" => "show_scores",
      "scoreboard.hide_scores" => "hide_scores",
      "scoreboard.question_clear" => "question_clear",
      "scoreboard.timer_start" => "timer_start",
      "scoreboard.timer_stop" => "timer_stop",
      "scoreboard.first_place_init" => "first_place_init",
      "scoreboard.first_place_prepare_plate" => "first_place_prepare_plate",
      "scoreboard.paper_seed_exit_all_players" => "paper_seed_exit_all_players",
    }.freeze

    # クラスレベルの Mutex でシングルトン初期化を保護する（スレッドセーフ）
    def self.instance
      @instance || INSTANCE_MUTEX.synchronize { @instance ||= new }
    end

    def self.reset!
      INSTANCE_MUTEX.synchronize do
        @instance&.shutdown
        @instance = nil
      end
    end

    # @rbs event_log: Scoreboard::EventLog
    def initialize(event_log: Scoreboard::EventLog.instance)
      @mutex = Mutex.new
      @queues = []
      @event_log = event_log
      @notification_subscribers = []
      subscribe_to_notifications
    end

    # 接続キューを登録する（接続開始時に呼ぶ）
    def register(queue)
      @mutex.synchronize { @queues << queue }
    end

    # 接続キューを解除する（接続終了時に呼ぶ）
    def unregister(queue)
      @mutex.synchronize { @queues.delete(queue) }
    end

    # 通知購読を解除する（シングルトン reset! 時・テスト後クリーンアップで使用）
    def shutdown
      @notification_subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      @notification_subscribers.clear
    end

    private

    def subscribe_to_notifications
      WITH_PAYLOAD.each do |notification_name, event_name|
        @notification_subscribers << ActiveSupport::Notifications.subscribe(notification_name) do |*, payload|
          broadcast(event_name, payload[:payload])
        end
      end

      WITHOUT_PAYLOAD.each do |notification_name, event_name|
        @notification_subscribers << ActiveSupport::Notifications.subscribe(notification_name) do |*|
          broadcast(event_name, {})
        end
      end
    end

    # record と push を同一ロック内で原子的に実行する。
    # 別ロックにすると並行発火時に id=5 の push より id=6 の push が先行し、
    # クライアントの Last-Event-ID が先行した高い id になって低い id を取りこぼす。
    def broadcast(event_name, data)
      @mutex.synchronize do
        entry = @event_log.record(event_name, data)
        @queues.each { |q| q.push({ id: entry.id, event: entry.event, data: entry.data }) }
      end
    end
  end
end

require "rails_helper"

RSpec.describe Scoreboard::SseController, type: :controller do
  # テスト用ヘルパー:
  # - SseWriter.write の呼び出しを記録する spy を設定
  # - キューメッセージを積んでコントローラを実行し、書き込まれた SSE チャンクを返す
  def run_stream(event_log:, last_event_id: nil, queue_messages: [])
    queue = Thread::Queue.new
    allow(Thread::Queue).to receive(:new).and_return(queue)
    allow(controller).to receive(:start_heartbeat).with(queue).and_return(double(kill: nil))

    subs = instance_double(
      Scoreboard::SseSubscriptions,
      subscribe_all: nil,
      unsubscribe_all: nil
    )
    allow(Scoreboard::SseSubscriptions).to receive(:new)
      .with(queue)
      .and_return(subs)
    allow(Scoreboard::EventLog).to receive(:instance).and_return(event_log)

    # SseWriter.write の呼び出しを記録する
    writes = []
    allow(Scoreboard::SseWriter).to receive(:write) do |_stream, event, data, id: nil|
      writes << { event: event, data: data, id: id }
    end

    # queue にメッセージを積み、最後は IOError で終了させる
    queue_messages.each { |msg| queue.push(msg) }
    allow(queue).to receive(:pop).and_wrap_original do |orig|
      queue.empty? ? raise(IOError) : orig.call
    end

    request.headers["Last-Event-ID"] = last_event_id.to_s if last_event_id

    get :stream

    writes
  end

  describe "#stream" do
    context "初回接続（Last-Event-ID なし）" do
      it "replay は実行されず、queue のイベントのみ配信される" do
        event_log = Scoreboard::EventLog.new
        3.times { |i| event_log.record("event_#{i + 1}", {}) }

        writes = run_stream(
          event_log: event_log,
          queue_messages: [{ id: 4, event: "show_scores", data: {} }]
        )

        expect(writes.pluck(:event)).to eq(["show_scores"])
        expect(writes.pluck(:id)).to eq([4])
      end

      it "queue のイベントが replay_upper_bound で破棄されない（id <= current_max_id でも通過）" do
        event_log = Scoreboard::EventLog.new
        3.times { event_log.record("prev_event", {}) }
        # current_max_id = 3、Last-Event-ID なし → replay_upper_bound = nil

        writes = run_stream(
          event_log: event_log,
          queue_messages: [{ id: 2, event: "queued_event", data: {} }]
          # id=2 は current_max_id(3) 以下だが、replay_upper_bound=nil なので破棄されない
        )

        expect(writes.pluck(:event)).to include("queued_event")
      end
    end

    context "再接続（Last-Event-ID あり）・欠損なし再送" do
      it "Last-Event-ID: 3 のとき id:4, id:5 のイベントが1回ずつ書き込まれ id:1〜3 は含まれない" do
        event_log = Scoreboard::EventLog.new
        5.times { |i| event_log.record("event_#{i + 1}", {}) }

        writes = run_stream(event_log: event_log, last_event_id: 3)

        written_ids = writes.pluck(:id)
        written_events = writes.pluck(:event)

        expect(written_ids).to include(4, 5)
        expect(written_events).to include("event_4", "event_5")
        expect(written_events).not_to include("event_1", "event_2", "event_3")
        # 各イベントはちょうど1回
        expect(written_events.count("event_4")).to eq(1)
        expect(written_events.count("event_5")).to eq(1)
      end
    end

    context "境界重複なし（決定論的）" do
      it "replay と queue の両方に存在するイベントは1回だけ書き込まれる" do
        event_log = Scoreboard::EventLog.new
        5.times { |i| event_log.record("event_#{i + 1}", {}) }
        # current_max_id = 5

        # id:5 のイベントが queue にも存在する（subscribe_all〜replay_upper_bound間に発生したケース）
        writes = run_stream(
          event_log: event_log,
          last_event_id: 3,
          queue_messages: [{ id: 5, event: "event_5", data: {} }]
        )

        # id:5 のイベントは1回だけ（replayで送信済み、queueは破棄）
        expect(writes.count { |w| w[:event] == "event_5" }).to eq(1)
      end
    end

    context "欠損超過 → 再同期" do
      it "Last-Event-ID が保持範囲外（古すぎる）のとき resync_required イベントのみ書き込まれる" do
        event_log = Scoreboard::EventLog.new
        150.times { |i| event_log.record("event_#{i + 1}", {}) }
        oldest = event_log.oldest_id

        writes = run_stream(event_log: event_log, last_event_id: oldest - 2)

        expect(writes.pluck(:event)).to eq(["resync_required"])
      end

      it "Last-Event-ID が未来ID（current_max_id より大きい）のとき resync_required イベントのみ書き込まれる" do
        event_log = Scoreboard::EventLog.new
        3.times { |i| event_log.record("event_#{i + 1}", {}) }
        # current_max_id = 3、Last-Event-ID: 99 は未来ID

        writes = run_stream(event_log: event_log, last_event_id: 99)

        expect(writes.pluck(:event)).to eq(["resync_required"])
      end
    end

    context "購読・解除のライフサイクル" do
      it "SseSubscriptions.new が正しい引数で呼ばれ、subscribe_all と unsubscribe_all が実行される" do
        event_log = Scoreboard::EventLog.new
        subs_double = instance_double(
          Scoreboard::SseSubscriptions,
          subscribe_all: nil,
          unsubscribe_all: nil
        )
        allow(Scoreboard::SseSubscriptions).to receive(:new)
          .with(anything)
          .and_return(subs_double)
        allow(Scoreboard::EventLog).to receive(:instance).and_return(event_log)

        queue = Thread::Queue.new
        allow(Thread::Queue).to receive(:new).and_return(queue)
        allow(controller).to receive(:start_heartbeat).and_return(double(kill: nil))
        allow(queue).to receive(:pop).and_raise(IOError)
        allow(Scoreboard::SseWriter).to receive(:write)

        get :stream

        expect(subs_double).to have_received(:subscribe_all)
        expect(subs_double).to have_received(:unsubscribe_all)
      end
    end
  end
end

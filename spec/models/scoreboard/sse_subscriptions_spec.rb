require "rails_helper"

# イベント契約テーブル: [通知名, instrument引数, 期待event名, 期待data]
SSE_EVENT_TABLE = [
  ["scoreboard.match_init", { payload: { matchId: 1 } }, "match_init", { matchId: 1 }],
  ["scoreboard.update", { payload: { matchId: 2 } }, "match_update", { matchId: 2 }],
  ["scoreboard.show_scores", {}, "show_scores", {}],
  ["scoreboard.hide_scores", {}, "hide_scores", {}],
  ["scoreboard.question_show", { payload: { text: "Q", answer: "A" } }, "question_show", { text: "Q", answer: "A" }],
  ["scoreboard.question_clear", {}, "question_clear", {}],
].freeze

RSpec.describe Scoreboard::SseSubscriptions do
  describe "通知→Queue の配線（テーブル駆動）" do
    SSE_EVENT_TABLE.each do |notification, params, expected_event, expected_data|
      it "#{notification} 通知が event: #{expected_event}, data: #{expected_data} を queue に入れる" do
        queue = Thread::Queue.new
        subs = described_class.new(queue)
        subs.subscribe_all
        ActiveSupport::Notifications.instrument(notification, params)
        msg = queue.pop(true)
        expect(msg[:event]).to eq(expected_event)
        expect(msg[:data]).to eq(expected_data)
      ensure
        subs.unsubscribe_all
      end
    end
  end

  describe "多重購読ガード" do
    it "subscribe_all を2回呼んでも queue に1個しか入らない" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.subscribe_all
      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })
      queue.pop(true)
      expect(queue).to be_empty
    ensure
      subs.unsubscribe_all
    end
  end

  describe "unsubscribe_all" do
    it "unsubscribe_all 後は通知が queue に入らない" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.unsubscribe_all
      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })
      expect(queue).to be_empty
    end
  end

  describe "SseSubscriptions + SseWriter パイプライン（ふるまい回帰）" do
    it "scoreboard.update 通知が SseWriter.write に match_update として到達する" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })
      msg = queue.pop(true)
      io = StringIO.new
      Scoreboard::SseWriter.write(io, msg[:event], msg[:data])
      expect(io.string).to include("event: match_update\n")
      expect(io.string).to include('"matchId":1')
    ensure
      subs.unsubscribe_all
    end
  end
end

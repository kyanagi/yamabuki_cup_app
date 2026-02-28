require "rails_helper"

# イベント契約テーブル: [通知名, instrument引数, 期待event名, 期待data]
SSE_EVENT_TABLE = [
  ["scoreboard.match_init", { payload: { matchId: 1 } }, "match_init", { matchId: 1 }],
  ["scoreboard.update", { payload: { matchId: 2 } }, "match_update", { matchId: 2 }],
  ["scoreboard.show_scores", {}, "show_scores", {}],
  ["scoreboard.hide_scores", {}, "hide_scores", {}],
  [
    "scoreboard.question_show",
    { payload: { text: "Q", answer: "A" } },
    "question_show",
    { text: "Q", answer: "A" },
  ],
  ["scoreboard.question_clear", {}, "question_clear", {}],
  # タイマー
  [
    "scoreboard.timer_init",
    { payload: { footerLabel: "1R 1時間クイズ" } },
    "timer_init",
    { footerLabel: "1R 1時間クイズ" },
  ],
  [
    "scoreboard.timer_set_remaining_time",
    { payload: { remainingTimeMs: 60000 } },
    "timer_set_remaining_time",
    { remainingTimeMs: 60000 },
  ],
  ["scoreboard.timer_start", {}, "timer_start", {}],
  ["scoreboard.timer_stop", {}, "timer_stop", {}],
  # 1位発表
  ["scoreboard.first_place_init", {}, "first_place_init", {}],
  ["scoreboard.first_place_prepare_plate", {}, "first_place_prepare_plate", {}],
  [
    "scoreboard.first_place_display_player",
    { payload: { playerName: "テスト選手" } },
    "first_place_display_player",
    { playerName: "テスト選手" },
  ],
  # シード発表
  [
    "scoreboard.paper_seed_init",
    { payload: { footerLabel: "1R 1時間クイズ" } },
    "paper_seed_init",
    { footerLabel: "1R 1時間クイズ" },
  ],
  [
    "scoreboard.paper_seed_display_player",
    { payload: { rank: 1, name: "テスト選手", score: 100 } },
    "paper_seed_display_player",
    { rank: 1, name: "テスト選手", score: 100 },
  ],
  ["scoreboard.paper_seed_exit_all_players", {}, "paper_seed_exit_all_players", {}],
  # 2R発表
  [
    "scoreboard.round2_announcement_init",
    { payload: {
      footerLabel: "2R A卓",
      gridClass: "match-scorelist-column2-row5",
      players: [{ rank: 1 }],
    } },
    "round2_announcement_init",
    { footerLabel: "2R A卓", gridClass: "match-scorelist-column2-row5", players: [{ rank: 1 }] },
  ],
  [
    "scoreboard.round2_announcement_display_player",
    { payload: { rank: 1, name: "テスト選手" } },
    "round2_announcement_display_player",
    { rank: 1, name: "テスト選手" },
  ],
  [
    "scoreboard.round2_announcement_display_all_players",
    { payload: {
      footerLabel: "2R A卓",
      gridClass: "match-scorelist-column2-row5",
      players: [{ rank: 1, name: "テスト選手" }],
    } },
    "round2_announcement_display_all_players",
    {
      footerLabel: "2R A卓",
      gridClass: "match-scorelist-column2-row5",
      players: [{ rank: 1, name: "テスト選手" }],
    },
  ],
  # アナウンス・チャンピオン
  [
    "scoreboard.announcement",
    { payload: { text: "テストアナウンス" } },
    "announcement",
    { text: "テストアナウンス" },
  ],
  [
    "scoreboard.champion",
    { payload: { name: "テスト選手", tournamentName: "第2回やまぶき杯" } },
    "champion",
    { name: "テスト選手", tournamentName: "第2回やまぶき杯" },
  ],
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

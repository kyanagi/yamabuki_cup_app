require "rails_helper"

# イベント契約テーブル（SseSubscriptions から移植）: [通知名, instrument引数, 期待event名, 期待data]
BROADCASTER_EVENT_TABLE = [
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

RSpec.describe Scoreboard::EventBroadcaster do
  # 各テストは独立したインスタンスを使い、ensure で shutdown して通知購読をクリーンアップする

  describe "通知→Queue の配線（テーブル駆動）" do
    BROADCASTER_EVENT_TABLE.each do |notification, params, expected_event, expected_data|
      it "#{notification} 通知が event: #{expected_event}, data: #{expected_data} を queue に入れる" do
        event_log = Scoreboard::EventLog.new
        broadcaster = described_class.new(event_log: event_log)
        queue = Thread::Queue.new
        broadcaster.register(queue)

        ActiveSupport::Notifications.instrument(notification, params)

        msg = queue.pop(true)
        expect(msg[:event]).to eq(expected_event)
        expect(msg[:data]).to eq(expected_data)
        expect(msg[:id]).to be_a(Integer)
      ensure
        broadcaster.shutdown
      end
    end
  end

  describe "複数キューへの配信" do
    it "2キュー登録時、同一通知が両方に届き id は同一（EventLog への記録は1回）" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      q1 = Thread::Queue.new
      q2 = Thread::Queue.new
      broadcaster.register(q1)
      broadcaster.register(q2)

      ActiveSupport::Notifications.instrument("scoreboard.show_scores", {})

      msg1 = q1.pop(true)
      msg2 = q2.pop(true)
      expect(msg1[:event]).to eq("show_scores")
      expect(msg2[:event]).to eq("show_scores")
      # 同一IDであること（1回だけ記録された証拠）
      expect(msg1[:id]).to eq(msg2[:id])
      # EventLog には1エントリのみ
      expect(event_log.current_max_id).to eq(1)
    ensure
      broadcaster.shutdown
    end
  end

  describe "接続が0件のときも EventLog に記録される" do
    it "キューが1件も登録されていなくてもイベントが記録される" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      # キューを登録しない

      ActiveSupport::Notifications.instrument("scoreboard.show_scores", {})

      expect(event_log.current_max_id).to eq(1)
    ensure
      broadcaster.shutdown
    end
  end

  describe "#register / #unregister" do
    it "unregister 後は通知が queue に入らない" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      queue = Thread::Queue.new
      broadcaster.register(queue)
      broadcaster.unregister(queue)

      ActiveSupport::Notifications.instrument("scoreboard.show_scores", {})

      expect(queue).to be_empty
    ensure
      broadcaster.shutdown
    end
  end

  describe "#shutdown" do
    it "shutdown 後は通知がどのキューにも届かない" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      queue = Thread::Queue.new
      broadcaster.register(queue)
      broadcaster.shutdown

      ActiveSupport::Notifications.instrument("scoreboard.show_scores", {})

      expect(queue).to be_empty
    end
  end

  describe "連番テスト" do
    it "2イベント連続発火すると msg2[:id] == msg1[:id] + 1" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      queue = Thread::Queue.new
      broadcaster.register(queue)

      ActiveSupport::Notifications.instrument("scoreboard.show_scores", {})
      ActiveSupport::Notifications.instrument("scoreboard.hide_scores", {})

      msg1 = queue.pop(true)
      msg2 = queue.pop(true)
      expect(msg2[:id]).to eq(msg1[:id] + 1)
    ensure
      broadcaster.shutdown
    end
  end

  describe "SseWriter パイプライン統合" do
    it "scoreboard.update 通知が SseWriter.write に match_update として到達する" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      queue = Thread::Queue.new
      broadcaster.register(queue)

      ActiveSupport::Notifications.instrument("scoreboard.update", payload: { matchId: 1 })

      msg = queue.pop(true)
      io = StringIO.new
      Scoreboard::SseWriter.write(io, msg[:event], msg[:data], id: msg[:id])
      expect(io.string).to include("id: #{msg[:id]}\n")
      expect(io.string).to include("event: match_update\n")
      expect(io.string).to include('"matchId":1')
    ensure
      broadcaster.shutdown
    end
  end

  describe "並行発火時の順序保証（P2: 原子的 record+push）" do
    it "複数スレッドが同時に通知を発火してもキューのIDが昇順になる" do
      event_log = Scoreboard::EventLog.new
      broadcaster = described_class.new(event_log: event_log)
      queue = Thread::Queue.new
      broadcaster.register(queue)

      n = 20
      threads = n.times.map do
        Thread.new { ActiveSupport::Notifications.instrument("scoreboard.show_scores", {}) }
      end
      threads.each(&:join)

      ids = n.times.map { queue.pop(true)[:id] }
      expect(ids).to eq(ids.sort)
    ensure
      broadcaster.shutdown
    end
  end

  describe ".instance シングルトン" do
    after { described_class.reset! }

    it "同じインスタンスを返す" do
      a = described_class.instance
      b = described_class.instance
      expect(a.object_id).to eq(b.object_id)
    end

    it "reset! 後は新しいインスタンスを返す" do
      first = described_class.instance
      described_class.reset!
      second = described_class.instance
      expect(second.object_id).not_to eq(first.object_id)
    end

    it "reset! 後は旧インスタンスに通知が届かない（P3: 旧購読の解放）" do
      queue = Thread::Queue.new
      first = described_class.instance
      first.register(queue)

      described_class.reset!

      ActiveSupport::Notifications.instrument("scoreboard.show_scores", {})

      expect(queue).to be_empty
    ensure
      described_class.reset!
    end
  end
end

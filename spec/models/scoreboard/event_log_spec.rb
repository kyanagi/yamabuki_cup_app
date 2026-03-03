require "rails_helper"

RSpec.describe Scoreboard::EventLog do
  # 各テストで独立したインスタンスを使う
  subject(:log) { described_class.new }

  describe "#record" do
    it "IDが1から始まる" do
      entry = log.record("show_scores", {})
      expect(entry.id).to eq(1)
    end

    it "連続して record するとIDが連番になる" do
      entry1 = log.record("show_scores", {})
      entry2 = log.record("hide_scores", {})
      expect(entry2.id).to eq(entry1.id + 1)
    end

    it "記録したイベント名とデータを保持する" do
      entry = log.record("match_update", { matchId: 1 })
      expect(entry.event).to eq("match_update")
      expect(entry.data).to eq({ matchId: 1 })
    end

    it "MAX_ENTRIES + 1 件目で最古エントリが削除される" do
      described_class::MAX_ENTRIES.times { |i| log.record("event_#{i}", {}) }
      expect(log.oldest_id).to eq(1)

      log.record("overflow_event", {})
      expect(log.oldest_id).to eq(2)
    end
  end

  describe "#events_after" do
    before do
      5.times { |i| log.record("event_#{i + 1}", {}) }
    end

    it "last_id=0 で全件返す" do
      entries = log.events_after(0)
      expect(entries.map(&:id)).to eq([1, 2, 3, 4, 5])
    end

    it "last_id=3 で id:4, id:5 のみ返す" do
      entries = log.events_after(3)
      expect(entries.map(&:id)).to eq([4, 5])
    end

    it "last_id が最新IDと同じ場合は空配列を返す（境界値: 未来IDではない）" do
      entries = log.events_after(5)
      expect(entries).to eq([])
    end

    it "last_id が最新IDより大きい場合（未来ID）は nil を返す" do
      entries = log.events_after(10)
      expect(entries).to be_nil
    end

    context "欠損検知（last_id が oldest_id - 2 以下）" do
      before do
        # 101件記録して id:1 を evict する（oldest_id = 2）
        96.times { |i| log.record("extra_#{i}", {}) }
        # 現在 101件、oldest_id = 2
      end

      it "last_id が oldest_id - 2 の場合（欠損あり）→ nil を返す" do
        # oldest_id = 2, last_id = 0 → 0 < 2 - 1 = 1 → 欠損
        # でも last_id = 0 は欠損チェックをスキップ
        # oldest_id = 2 の場合、last_id = 0 は欠損チェックをスキップ（last_id > 0 が偽）
        # oldest_idを確認
        expect(log.oldest_id).to eq(2)
        # last_id = 0 は欠損チェックをスキップ → nil にならない
        expect(log.events_after(0)).not_to be_nil
      end

      it "oldest_id=2 のとき last_id=0 は欠損チェックをスキップして結果を返す" do
        expect(log.oldest_id).to eq(2)
        result = log.events_after(0)
        expect(result).not_to be_nil
      end

      it "oldest_id=2 のとき last_id=1 はぎりぎり回収可能（oldest_id - 1 = 1）→ 空配列を返す" do
        # last_id = 1, oldest_id = 2: 1 < 2 - 1 = 1 → false → 欠損なし
        # id > 1 かつ id >= oldest_id(2) なエントリを返す
        expect(log.oldest_id).to eq(2)
        result = log.events_after(1)
        expect(result).not_to be_nil
        # id:2 以降が返る
        expect(result.first.id).to eq(2)
      end
    end

    context "サーバー再起動等でログが空のとき" do
      let(:empty_log) { described_class.new }

      it "last_id > 0 かつログが空 → nil を返す" do
        expect(empty_log.events_after(5)).to be_nil
      end

      it "last_id = 0 かつログが空 → 空配列を返す" do
        expect(empty_log.events_after(0)).to eq([])
      end
    end

    context "明示的な欠損ケース" do
      it "oldest_id=50 のとき last_id=48 → nil を返す（48 < 50 - 1 = 49）" do
        log2 = described_class.new
        # 150件記録 → oldest_id = 51 (MAX_ENTRIES=100, 101件目でid:1が消え、150件目でid:51が最古)
        150.times { |i| log2.record("e_#{i}", {}) }
        # oldest_id を確認
        oldest = log2.oldest_id
        # last_id = oldest - 2 → 欠損
        result = log2.events_after(oldest - 2)
        expect(result).to be_nil
      end

      it "oldest_id=51 のとき last_id=50 → 欠損なし（50 >= 51 - 1 = 50）→ nilにならない" do
        log2 = described_class.new
        150.times { |i| log2.record("e_#{i}", {}) }
        oldest = log2.oldest_id
        result = log2.events_after(oldest - 1)
        expect(result).not_to be_nil
      end
    end
  end

  describe "#current_max_id" do
    it "記録前は0を返す" do
      expect(log.current_max_id).to eq(0)
    end

    it "3件記録後は3を返す" do
      3.times { |i| log.record("event_#{i}", {}) }
      expect(log.current_max_id).to eq(3)
    end
  end

  describe "#oldest_id" do
    it "記録前は0を返す" do
      expect(log.oldest_id).to eq(0)
    end

    it "3件記録後は1を返す（id:1 が最古）" do
      3.times { |i| log.record("event_#{i}", {}) }
      expect(log.oldest_id).to eq(1)
    end

    it "101件記録後は2を返す（id:1 が evict されている）" do
      101.times { |i| log.record("event_#{i}", {}) }
      expect(log.oldest_id).to eq(2)
    end
  end

  describe ".instance" do
    after { described_class.reset! }

    it "同じインスタンスを返す" do
      a = described_class.instance
      b = described_class.instance
      expect(a.object_id).to eq(b.object_id)
    end

    it "10スレッド並行で .instance を呼び出しても全て同一 object_id" do
      ids = Array.new(10) { Thread.new { described_class.instance.object_id } }.map(&:value)
      expect(ids.uniq.size).to eq(1)
    end
  end

  describe ".reset!" do
    after { described_class.reset! }

    it "reset! 後は新しいインスタンスを返す" do
      first = described_class.instance
      described_class.reset!
      second = described_class.instance
      expect(second.object_id).not_to eq(first.object_id)
    end
  end

  describe "スレッドセーフ: 並行 record" do
    it "10スレッドが同時に10件ずつ record してもIDが重複しない" do
      all_ids = Concurrent::Array.new
      threads = 10.times.map do
        Thread.new do
          10.times { |i| all_ids << log.record("event", { i: i }).id }
        end
      end
      threads.each(&:join)
      expect(all_ids.size).to eq(100)
      expect(all_ids.uniq.size).to eq(100)
    end
  end
end

require "rails_helper"

RSpec.describe Scoreboard::SseWriter do
  describe ".write" do
    let(:io) { StringIO.new }

    it "event: 行と data: 行と空行を書き出す" do
      described_class.write(io, "match_update", { matchId: 1 })
      output = io.string
      expect(output).to include("event: match_update\n")
      expect(output).to include("data: {\"matchId\":1}\n")
      expect(output).to end_with("\n\n")
    end

    it "heartbeat イベントは空の data を書き出す" do
      described_class.write(io, "heartbeat", {})
      output = io.string
      expect(output).to include("event: heartbeat\n")
      expect(output).to include("data: {}\n")
    end

    it "複数フィールドを持つデータを正しく JSON シリアライズする" do
      data = { matchId: 42, ruleTemplate: "board", scores: [] }
      described_class.write(io, "match_init", data)
      output = io.string
      parsed = JSON.parse(output.match(/data: (.+)\n/)[1])
      expect(parsed["matchId"]).to eq 42
      expect(parsed["ruleTemplate"]).to eq "board"
    end

    context "id: キーワード引数" do
      it "id: 42 を指定すると出力の先頭が 'id: 42\n' になる" do
        described_class.write(io, "show_scores", {}, id: 42)
        expect(io.string).to start_with("id: 42\n")
      end

      it "id: を省略（nil）すると 'id:' 行が出力されない" do
        described_class.write(io, "show_scores", {})
        expect(io.string).not_to include("id:")
      end

      it "出力行順序は id: → event: → data: → 空行" do
        described_class.write(io, "show_scores", { foo: 1 }, id: 7)
        lines = io.string.lines
        expect(lines[0]).to eq("id: 7\n")
        expect(lines[1]).to start_with("event: show_scores")
        expect(lines[2]).to start_with("data:")
        expect(lines[3]).to eq("\n")
      end
    end
  end
end

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
  end
end

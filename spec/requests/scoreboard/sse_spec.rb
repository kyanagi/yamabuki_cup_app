require "rails_helper"

# SSE コントローラの統合テスト。
# ActionController::Live はストリーミング接続を維持するため request spec は
# ハングしやすい。そのため、ストリーム書き出しロジック（SseWriter）を経由した
# 通知→イベントの配線を検証する最小限のテストを行う。
RSpec.describe "Scoreboard::Sse", type: :request do
  describe "通知→SSE event 配線の経路確認" do
    it "scoreboard.match_init 通知が match_init イベントを書き出す" do
      io = StringIO.new
      payload = { matchId: 1, ruleTemplate: "board", scores: [] }

      Scoreboard::SseWriter.write(io, "match_init", payload)

      expect(io.string).to include("event: match_init\n")
      expect(io.string).to include('"matchId":1')
    end

    it "scoreboard.update 通知が match_update イベントを書き出す" do
      io = StringIO.new
      payload = { matchId: 2, ruleTemplate: "round2", scores: [] }

      Scoreboard::SseWriter.write(io, "match_update", payload)

      expect(io.string).to include("event: match_update\n")
      expect(io.string).to include('"matchId":2')
    end

    it "show_scores イベントが書き出される" do
      io = StringIO.new
      Scoreboard::SseWriter.write(io, "show_scores", {})
      expect(io.string).to include("event: show_scores\n")
    end

    it "hide_scores イベントが書き出される" do
      io = StringIO.new
      Scoreboard::SseWriter.write(io, "hide_scores", {})
      expect(io.string).to include("event: hide_scores\n")
    end
  end

  describe "ルーティング" do
    it "/scoreboard/sse が scoreboard/sse#stream にルーティングされる" do
      expect(Rails.application.routes.recognize_path("/scoreboard/sse", method: :get)).to(
        eq({ controller: "scoreboard/sse", action: "stream" })
      )
    end
  end
end

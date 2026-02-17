require "rails_helper"

RSpec.describe MatchRule::Round2Ura do
  let(:match) { create(:match, round: Round::ROUND2, rule_name: "MatchRule::Round2Ura") }
  let(:match_rule) { described_class.new(match) }
  let!(:players) { create_list(:player, 12) }
  let(:matchings) do
    players.each_with_index.map do |player, seat|
      create(:matching, match:, seat:, player:)
    end
  end
  let(:match_opening) { create(:score_operation, match:) }
  let!(:initial_scores) do
    matchings.map.with_index do |matching, seat|
      create(:score, score_operation: match_opening, matching:, **match.rule.initial_score_attributes_of(seat))
    end
  end

  let(:question_closing) { build(:question_closing, match:) }

  before do
    match.update!(last_score_operation: match_opening)
  end

  describe "初期状態" do
    it "全員が参加状態で全員0ポイント開始であること" do
      expect(initial_scores.map(&:status)).to all(eq("playing"))
      expect(initial_scores.map(&:points)).to eq([0] * 12)
    end
  end

  describe "#process_question_closing" do
    it "3問目の正解で勝ち抜けになること" do
      initial_scores[0].update!(points: 2)
      result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")

      match_rule.process_question_closing(question_closing, [result])

      score = match_rule.instance_variable_get(:@scores)[0]
      expect(score.points).to eq(3)
      expect(score).to be_status_win
      expect(score.rank).to eq(1)
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    let!(:initial_scores) do
      [
        ["win", 3, 0, 1],
        ["playing", 2, 0],
        ["playing", 2, 1],
        ["playing", 1, 0],
        ["playing", 1, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
      ].map.with_index do |(status, points, misses, rank), i|
        create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
      end
    end

    it "限定問題終了時に上位4名が勝ち抜けになること" do
      match_rule.process_match_closing(match_closing)

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores.count(&:status_win?)).to eq(4)
      expect(scores[1]).to be_status_win
      expect(scores[2]).to be_status_win
      expect(scores[3]).to be_status_win
    end
  end

  describe "#progress_summary" do
    it "試合状況の概要を返すこと" do
      expect(match_rule.progress_summary).to eq "12→4／現在0人勝ち抜け、残り4人"
    end
  end
end

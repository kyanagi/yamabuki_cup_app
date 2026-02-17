require "rails_helper"

RSpec.describe MatchRule::Round2Omote do
  let(:match) { create(:match, round: Round::ROUND2, rule_name: "MatchRule::Round2Omote") }
  let(:match_rule) { described_class.new(match) }
  let!(:players) { create_list(:player, 10) }
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
    it "全員が参加状態で、各組上位3名のみ1ポイントを持つこと" do
      expect(initial_scores.map(&:status)).to all(eq("playing"))
      expect(initial_scores.map(&:points)).to eq([1, 1, 1, 0, 0, 0, 0, 0, 0, 0])
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

    it "2回目の誤答で失格になること" do
      initial_scores[0].update!(misses: 1)
      result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")

      match_rule.process_question_closing(question_closing, [result])

      score = match_rule.instance_variable_get(:@scores)[0]
      expect(score.misses).to eq(2)
      expect(score).to be_status_lose
      expect(score.rank).to eq(10)
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    let!(:initial_scores) do
      [
        ["win", 3, 0, 1],
        ["win", 3, 0, 2],
        ["lose", 0, 2, 10],
        ["playing", 2, 0],
        ["playing", 2, 1],
        ["playing", 2, 1],
        ["playing", 1, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
        ["playing", 0, 0],
      ].map.with_index do |(status, points, misses, rank), i|
        create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
      end
    end

    it "限定問題終了時に得点→誤答→席順で勝ち抜け者が決まること" do
      match_rule.process_match_closing(match_closing)

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores.count(&:status_win?)).to eq(4)
      expect(scores[3]).to be_status_win
      expect(scores[4]).to be_status_win
      expect(scores[3].rank).to eq(3)
      expect(scores[4].rank).to eq(4)
    end
  end

  describe "#progress_summary" do
    it "試合状況の概要を返すこと" do
      expect(match_rule.progress_summary).to eq "10→4／現在0人勝ち抜け、残り4人"
    end
  end
end

require "rails_helper"

RSpec.describe MatchRule::Playoff do
  let(:match) { create(:match, round: Round::PLAYOFF, rule_name: "MatchRule::Playoff") }
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
    it "全員10ポイントで開始すること" do
      expect(initial_scores.map(&:points)).to eq([10] * 10)
      expect(initial_scores.map(&:status)).to all(eq("playing"))
    end
  end

  describe "#process_question_closing" do
    it "正解者以外が-1されること" do
      result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")

      match_rule.process_question_closing(question_closing, [result])

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores[0].points).to eq(10)
      expect(scores[1..].map(&:points)).to eq([9] * 9)
    end

    it "誤答者のみが-1されること" do
      result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")

      match_rule.process_question_closing(question_closing, [result])

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores[0].points).to eq(9)
      expect(scores[1..].map(&:points)).to eq([10] * 9)
    end

    it "スルー時は全員が1ポイント減ること" do
      match_rule.process_question_closing(question_closing, [])

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores.map(&:points)).to eq([9] * 10)
    end

    it "全員が1ポイント以下のときスルー減点しないこと" do
      initial_scores.each { it.update!(points: 1) }

      match_rule.process_question_closing(question_closing, [])

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores.map(&:points)).to eq([1] * 10)
    end

    it "0ポイント以下になった選手が失格になること" do
      initial_scores[0].update!(points: 1)
      result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")

      match_rule.process_question_closing(question_closing, [result])

      score = match_rule.instance_variable_get(:@scores)[0]
      expect(score).to be_status_lose
      expect(score.rank).to eq(10)
    end

    it "最後の1名になったとき自動で勝ち抜け確定すること" do
      initial_scores[0].update!(points: 2)
      initial_scores[1..].each.with_index(1) do |score, idx|
        score.update!(status: "lose", points: 0, rank: 11 - idx)
      end
      result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")

      match_rule.process_question_closing(question_closing, [result])

      score = match_rule.instance_variable_get(:@scores)[0]
      expect(score).to be_status_win
      expect(score.rank).to eq(1)
    end
  end

  describe "#progress_summary" do
    it "試合状況の概要を返すこと" do
      expect(match_rule.progress_summary).to eq "10→1／現在0人勝ち抜け、残り1人"
    end
  end
end

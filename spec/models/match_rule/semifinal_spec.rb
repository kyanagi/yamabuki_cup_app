require "rails_helper"

RSpec.describe MatchRule::Semifinal do
  let(:round) { Round::SEMIFINAL }
  let(:rule_name) { "MatchRule::Semifinal" }
  let(:match) { create(:match, round:, rule_name:) }
  let(:match_rule) { rule_name.constantize.new(match) }
  let!(:players) { create_list(:player, 8) }
  let(:matchings) do
    Array.new(players.size) do |i|
      create(:matching, match:, seat: i, player: players[i])
    end
  end
  let(:match_opening) { create(:score_operation, match:) }
  let!(:initial_scores) do
    Array.new(players.size) do |i|
      create(:score, score_operation: match_opening, matching: matchings[i], **match.rule.initial_score_attributes_of(i))
    end
  end

  let(:question_closing) { build(:question_closing, match:) }

  before do
    match.update!(last_score_operation: match_opening)
  end

  describe "#process_question_closing" do
    context "正解のとき" do
      it "得点が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "unpushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 1
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "誤答のとき" do
      it "得点は変わらず、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "unpushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 0
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end
  end

  describe "#process_disqualification" do
    let(:disqualification) { build(:disqualification, match:, player: players[0]) }

    it "選手を敗者にすること" do
      match_rule.process_disqualification(disqualification)
      scores = match_rule.instance_variable_get(:@scores)
      expect(scores[0].status).to eq "lose"
      expect(scores[1..]).to all be_status_playing
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    context "得点に差がある場合" do
      let!(:initial_scores) do
        [
          "playing",
          "playing",
          "lose",
          "playing",
          "lose",
          "playing",
          "lose",
          "lose",
        ].map.with_index do |status, i|
          create(:score, score_operation: match_opening, matching: matchings[i], status:)
        end
      end

      it "生存者が勝者となること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win win lose win
          lose win lose lose
        )
      end
    end
  end
end

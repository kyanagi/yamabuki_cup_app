require "rails_helper"

RSpec.describe MatchRule::Semifinal do
  let(:round) { Round::SEMIFINAL }
  let(:rule_name) { "MatchRule::Semifinal" }
  let(:match) { create(:match, round:, rule_name:) }
  let(:match_rule) { rule_name.constantize.new(match) }
  let!(:players) { create_list(:player, 8) }
  let!(:matchings) do
    players.map.with_index do |player, seat|
      Matching.create_with_initial_state!(match:, player:, seat:)
    end
  end

  describe "#process" do
    context "正解のとき" do
      it "得点が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "unpushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq 1
        expect(matchings[0].misses).to eq 0
        expect(matchings[0].status).to eq "playing"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "100回正解したとき" do
      it "得点が100増え、参加中のままであること" do
        100.times do
          question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "unpushed")
          match_rule.process([question_player_result])
        end

        matchings[0].reload
        expect(matchings[0].points).to eq 100
        expect(matchings[0].misses).to eq 0
        expect(matchings[0].status).to eq "playing"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "誤答のとき" do
      it "得点は変わらず、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "unpushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq 0
        expect(matchings[0].status).to eq "playing"
        expect(matchings[0].rank).to be_nil
      end
    end
  end

  describe "#disqualify" do
    it "選手を敗者にすること" do
      match_rule.disqualify(player_id: players[0].id)
      matchings[0].reload
      expect(matchings[0].status).to eq "lose"
    end
  end

  describe "#judge_on_quiz_completed" do
    context "得点に差がある場合" do
      let!(:matchings) do
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
          create(:matching, match:, seat: i, player: players[i], status:)
        end
      end

      it "生存者が勝者となること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win win lose win
          lose win lose lose
        )
      end
    end
  end
end

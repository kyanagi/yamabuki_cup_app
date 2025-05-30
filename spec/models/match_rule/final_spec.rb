require "rails_helper"

RSpec.describe MatchRule::Final do
  let(:round) { Round::FINAL }
  let(:rule_name) { "MatchRule::Final" }
  let(:match) { create(:match, round:, rule_name:) }
  let(:match_rule) { rule_name.constantize.new(match) }
  let!(:players) { create_list(:player, 4) }
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
      it "正解数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 1
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "3回目の正解のとき" do
      it "正解数が1増え、セット勝ち抜けになること" do
        initial_scores[0].update!(points: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 3
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "set_win"
        expect(scores[0].rank).to be_nil
      end
    end

    context "誤答のとき" do
      it "誤答数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 0
        expect(scores[0].misses).to eq 1
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "2回目の誤答のとき" do
      it "誤答数が1増え、待機中になること" do
        initial_scores[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 0
        expect(scores[0].misses).to eq 2
        expect(scores[0].status).to eq "waiting"
        expect(scores[0].rank).to be_nil
      end
    end
  end

  xdescribe "#process_special_question" do
    context "正解のとき" do
      it "星が1増えること" do
        matchings[0].update!(status: "set_win")
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "unpushed")
        match_rule.process_special_question(question_player_result)
        matchings[0].reload
        expect(matchings[0].stars).to eq 1
        expect(matchings[0].status).to eq "set_win"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "7回目の正解のとき" do
      it "勝ち抜けになること" do
        matchings[0].update!(status: "set_win", stars: 6)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "unpushed")
        match_rule.process_special_question(question_player_result)
        matchings[0].reload
        expect(matchings[0].stars).to eq 7
        expect(matchings[0].status).to eq "win"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "誤答のとき" do
      it "星が増えないこと" do
        matchings[0].update!(status: "set_win")
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "unpushed")
        expect do
          match_rule.process_special_question(question_player_result)
          matchings[0].reload
        end.not_to(change { matchings[0].stars })
      end
    end
  end
end

require "rails_helper"

RSpec.describe MatchRule::Round3Hayabo do
  let(:round) { Round::ROUND3 }
  let(:rule_name) { "MatchRule::Round3Hayabo" }
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

  describe "#process_question_closing" do
    context "押して正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
          build(:question_player_result, player: players[1], situation: "unpushed", result: "correct"),
        ]
      end

      it "得点が3増えること" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 3
      end
    end

    context "押して単独正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
        ]
      end

      it "得点が4増えること" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 4
      end
    end

    context "押して不正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "wrong"),
          build(:question_player_result, player: players[1], situation: "unpushed", result: "wrong"),
        ]
      end

      it "得点が-3減ること" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq(-3)
      end
    end

    context "押さずに正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "correct"),
          build(:question_player_result, player: players[1], situation: "unpushed", result: "correct"),
        ]
      end

      it "得点が1増えること" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 1
      end
    end

    context "押さずに単独正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "correct"),
        ]
      end

      it "得点が2増えること" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 2
      end
    end

    context "押さずに不正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "wrong"),
        ]
      end

      it "得点が変わらないこと" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 0
      end
    end

    context "正解で12点になったとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
        ]
      end

      it "勝ち抜けになること" do
        initial_scores[0].update!(points: 8)
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 12
        expect(scores[0].status).to eq "win"
      end
    end

    context "正解で13点以上になったとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
        ]
      end

      it "勝ち抜けになること" do
        initial_scores[0].update!(points: 10)
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 14
        expect(scores[0].status).to eq "win"
      end
    end

    context "複数人が同時に12点以上になったとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "correct"),
          build(:question_player_result, player: players[1], situation: "pushed", result: "correct"),
        ]
      end

      it "点数の高い順に上位になること" do
        initial_scores[0].update!(points: 11)
        initial_scores[1].update!(points: 10)
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 12
        expect(scores[0].status).to eq "win"
        expect(scores[0].rank).to eq 2
        expect(scores[1].points).to eq 13
        expect(scores[1].status).to eq "win"
        expect(scores[1].rank).to eq 1
      end
    end

    context "複数人が同時に12点以上になり、点数が同じとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "correct"),
          build(:question_player_result, player: players[1], situation: "unpushed", result: "correct"),
        ]
      end

      it "座席の昇順に勝ち抜けになること" do
        initial_scores[0].update!(points: 11)
        initial_scores[1].update!(points: 11)
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 12
        expect(scores[0].status).to eq "win"
        expect(scores[0].rank).to eq 1
        expect(scores[1].points).to eq 12
        expect(scores[1].status).to eq "win"
        expect(scores[1].rank).to eq 2
      end
    end

    describe "複数人の処理" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "correct"),
          build(:question_player_result, player: players[1], situation: "unpushed", result: "wrong"),
          build(:question_player_result, player: players[2], situation: "pushed", result: "correct"),
          build(:question_player_result, player: players[3], situation: "unpushed", result: "wrong"),
          build(:question_player_result, player: players[4], situation: "unpushed", result: "correct"),
          build(:question_player_result, player: players[5], situation: "unpushed", result: "correct"),
          build(:question_player_result, player: players[6], situation: "unpushed", result: "wrong"),
          build(:question_player_result, player: players[7], situation: "unpushed", result: "correct"),
        ]
      end

      it "全員の得点が正しく計算されること" do
        match_rule.process_question_closing(question_closing, question_player_results)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:points)).to eq [1, 0, 3, 0, 1, 1, 0, 1]
      end
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    context "勝ち抜け枠が残っていないとき" do
      before do
        initial_scores[0, 4].each { |score| score.update!(points: 12, status: "win") }
      end

      it "新たな勝ち抜け者が出ないこと" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[4, 4].map(&:status)).to eq %w(playing playing playing playing)
      end
    end

    context "勝ち抜け枠が残っているとき" do
      before do
        initial_scores[0, 2].each { |score| score.update!(points: 12, status: "win") }
      end

      it "点数の高い順に勝ち抜けになること" do
        initial_scores[2].update!(points: 10)
        initial_scores[3].update!(points: 11)
        initial_scores[4].update!(points: 9)
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[3].status).to eq "win"
        expect(scores[2].status).to eq "win"
        expect(scores[4].status).to eq "playing"
      end
    end

    context "勝ち抜け枠が残っていて、点数が同じとき" do
      before do
        initial_scores[0, 2].each { |score| score.update!(points: 12, status: "win") }
      end

      it "座席の昇順に勝ち抜けになること" do
        initial_scores[2].update!(points: 10)
        initial_scores[3].update!(points: 10)
        initial_scores[4].update!(points: 10)
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[2].status).to eq "win"
        expect(scores[3].status).to eq "win"
        expect(scores[4].status).to eq "playing"
      end
    end
  end
end

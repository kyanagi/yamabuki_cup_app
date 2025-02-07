require "rails_helper"

RSpec.describe MatchRule::Round3Hayabo do
  let(:round) { Round::ROUND3 }
  let(:match) { create(:match, round:, rule_name: "MatchRule::Round3Hayabo") }
  let!(:players) { create_list(:player, 8) }
  let!(:matchings) do
    players.map.with_index do |player, seat|
      Matching.create_with_initial_state!(match:, player:, seat:)
    end
  end
  let(:match_rule) { MatchRule::Round3Hayabo.new(match) }

  describe "#process" do
    context "押して正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
          build(:question_player_result, player: players[1], situation: "unpushed", result: "correct"),
        ]
      end

      it "得点が3増えること" do
        expect { match_rule.process(question_player_results) }.to change { matchings[0].reload.points }.by(3)
      end
    end

    context "押して単独正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
        ]
      end

      it "得点が4増えること" do
        expect { match_rule.process(question_player_results) }.to change { matchings[0].reload.points }.by(4)
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
        expect { match_rule.process(question_player_results) }.to change { matchings[0].reload.points }.by(-3)
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
        expect { match_rule.process(question_player_results) }.to change { matchings[0].reload.points }.by(1)
      end
    end

    context "押さずに単独正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "correct"),
        ]
      end

      it "得点が2増えること" do
        expect { match_rule.process(question_player_results) }.to change { matchings[0].reload.points }.by(2)
      end
    end

    context "押さずに不正解のとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "unpushed", result: "wrong"),
        ]
      end

      it "得点が変わらないこと" do
        expect { match_rule.process(question_player_results) }.not_to change(matchings[0].reload, :points)
      end
    end

    context "正解で12点になったとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
        ]
      end

      it "勝ち抜けになること" do
        matchings[0].update!(points: 8)
        match_rule.process(question_player_results)
        matchings[0].reload
        expect(matchings[0].points).to eq 12
        expect(matchings[0].status).to eq "win"
      end
    end

    context "正解で13点以上になったとき" do
      let(:question_player_results) do
        [
          build(:question_player_result, player: players[0], situation: "pushed", result: "correct"),
        ]
      end

      it "勝ち抜けになること" do
        matchings[0].update!(points: 10)
        match_rule.process(question_player_results)
        matchings[0].reload
        expect(matchings[0].points).to eq 14
        expect(matchings[0].status).to eq "win"
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
        matchings[0].update!(points: 11)
        matchings[1].update!(points: 10)
        match_rule.process(question_player_results)
        matchings[0].reload
        matchings[1].reload
        expect(matchings[0].points).to eq 12
        expect(matchings[0].status).to eq "win"
        expect(matchings[0].rank).to eq 2
        expect(matchings[1].points).to eq 13
        expect(matchings[1].status).to eq "win"
        expect(matchings[1].rank).to eq 1
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
        matchings[0].update!(points: 11)
        matchings[1].update!(points: 11)
        match_rule.process(question_player_results)
        matchings[0].reload
        matchings[1].reload
        expect(matchings[0].points).to eq 12
        expect(matchings[0].status).to eq "win"
        expect(matchings[0].rank).to eq 1
        expect(matchings[1].points).to eq 12
        expect(matchings[1].status).to eq "win"
        expect(matchings[1].rank).to eq 2
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
        expect(matchings.map(&:points)).to eq [0, 0, 0, 0, 0, 0, 0, 0]
        match_rule.process(question_player_results)
        matchings.each(&:reload)
        expect(matchings.map(&:points)).to eq [1, 0, 3, 0, 1, 1, 0, 1]
      end
    end
  end

  describe "#judge_on_quiz_completed" do
    context "勝ち抜け枠が残っていないとき" do
      before do
        matchings[0, 4].each { it.update!(points: 12, status: "win") }
      end

      it "新たな勝ち抜け者が出ないこと" do
        expect do
          match_rule.judge_on_quiz_completed
          matchings.each(&:reload)
        end.not_to(change { matchings.map(&:status) })
      end
    end

    context "勝ち抜け枠が残っているとき" do
      before do
        matchings.zip([
          [8, "playing"],
          [9, "playing"],
          [11, "playing"],
          [12, "win"],
          [10, "playing"],
          [7, "playing"],
          [6, "playing"],
          [5, "playing"],
        ]) do |matching, (points, status)|
          matching.update!(points:, status:)
        end
      end

      it "得点が高い順に勝ち抜け者になること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(playing win win win win playing playing playing)
      end
    end

    context "ボーダー上で同点で並んだとき" do
      before do
        matchings.zip([
          [8, "playing"],
          [5, "playing"],
          [8, "playing"],
          [8, "playing"],
          [12, "win"],
          [8, "playing"],
          [7, "playing"],
          [6, "playing"],
        ]) do |matching, (points, status)|
          matching.update!(points:, status:)
        end
      end

      it "同点の場合は席番号が小さい順に勝ち抜け者になること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(win playing win win win playing playing playing)
      end
    end
  end
end

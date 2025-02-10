require "rails_helper"

RSpec.describe MatchRule::Quarterfinal do
  let(:round) { Round::QUARTERFINAL }
  let(:rule_name) { "MatchRule::Quarterfinal" }
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
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
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
          question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
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
      it "得点が1減り、誤答数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq(-1)
        expect(matchings[0].misses).to eq 1
        expect(matchings[0].status).to eq "playing"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "3回目の誤答のとき" do
      it "得点が1減り、誤答数が1増え、待機中になること" do
        matchings[0].update!(misses: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq(-1)
        expect(matchings[0].misses).to eq 3
        expect(matchings[0].status).to eq "waiting"
        expect(matchings[0].rank).to be_nil
      end
    end
  end

  describe "#judge_on_quiz_completed" do
    context "得点に差がある場合" do
      let!(:matchings) do
        [
          ["playing", 10, 2],
          ["playing", 6, 1],
          ["playing", 9, 2],
          ["playing", 7, 0],

          ["playing", 8, 0],
          ["playing", 5, 1],
          ["playing", 4, 0],
          ["playing", 0, 0],
        ].map.with_index do |(status, points, misses), i|
          create(:matching, match:, seat: i, player: players[i], status:, points:, misses:)
        end
      end

      it "得点が多い順に勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win playing win win
          win playing playing playing
        )
        expect(matchings.map(&:rank)).to eq [1, nil, 2, 4, 3, nil, nil, nil]
      end
    end

    context "得点が同じで、誤答数に差がある場合" do
      let!(:matchings) do
        [
          ["playing", 10, 2],
          ["playing", 10, 1],
          ["playing", 7, 2],
          ["playing", 9, 2],

          ["playing", 8, 0],
          ["playing", 9, 1],
          ["playing", 9, 0],
          ["playing", 0, 0],
        ].map.with_index do |(status, points, misses), i|
          create(:matching, match:, seat: i, player: players[i], status:, points:, misses:)
        end
      end

      it "誤答数が少ない順に勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win win playing playing
          playing win win playing
        )
        expect(matchings.map(&:rank)).to eq [2, 1, nil, nil, nil, 4, 3, nil]
      end
    end

    context "得点も誤答数も同じ場合" do
      let!(:matchings) do
        [
          ["playing", 9, 2],
          ["playing", 9, 1],
          ["playing", 9, 2],
          ["playing", 9, 0],

          ["playing", 9, 0],
          ["playing", 9, 0],
          ["playing", 9, 0],
          ["playing", 9, 0],
        ].map.with_index do |(status, points, misses), i|
          create(:matching, match:, seat: i, player: players[i], status:, points:, misses:)
        end
      end

      it "上座優先で勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          playing playing playing win
          win win win playing
        )
        expect(matchings.map(&:rank)).to eq [nil, nil, nil, 1, 2, 3, 4, nil]
      end
    end
  end
end

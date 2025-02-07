require "rails_helper"

RSpec.describe MatchRule::Round3Hayaoshi71 do
  let(:round) { Round::ROUND3 }
  let(:rule_name) { "MatchRule::Round3Hayaoshi71" }
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
      it "正解数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq 1
        expect(matchings[0].misses).to eq 0
        expect(matchings[0].status).to eq "playing"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "7回目の正解のとき" do
      it "勝利数が1増え、勝ち抜けになること" do
        matchings[0].update!(points: 6)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq 7
        expect(matchings[0].status).to eq "win"
        expect(matchings[0].rank).to eq 1
      end
    end

    context "誤答のとき" do
      it "誤答数が1増え、失格になること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].misses).to eq 1
        expect(matchings[0].status).to eq "lose"
        expect(matchings[0].rank).to eq 8
      end

      it "失格者を除いたうちで最下位の順位がつくこと" do
        matchings[1].update!(status: "lose", rank: 8)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].rank).to eq 7
      end
    end

    context "トビ残りになったとき" do
      let!(:matchings) do
        statuses = ["win"] + (["lose"] * 3) + (["playing"] * 4)
        Array.new(players.size) do |i|
          create(:matching, match:, seat: i, player: players[i], status: statuses[i], points: 0, misses: 0)
        end
      end

      it "参加中の選手全員が勝ち抜けになること" do
        matchings[4].update!(misses: 2)
        question_player_result = build(:question_player_result, player: players[4], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])

        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(win lose lose lose lose win win win)
      end
    end
  end

  describe "#judge_on_quiz_completed" do
    context "正解数に差がある場合" do
      let!(:matchings) do
        [
          ["win", 7, 0, 1],
          ["lose", 2, 1, 8],
          ["playing", 6, 0],
          ["win", 7, 0, 2],

          ["playing", 2, 0],
          ["playing", 5, 0],
          ["playing", 4, 0],
          ["playing", 0, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:matching, match:, seat: i, player: players[i], status:, points:, misses:, rank:)
        end
      end

      it "正解数が多い順に勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win lose win win
          playing win playing playing
        )
        expect(matchings.map(&:rank)).to eq [1, 8, 3, 2, nil, 4, nil, nil]
      end
    end

    context "正解数が同じ場合" do
      let!(:matchings) do
        [
          ["win", 7, 0, 1],
          ["lose", 2, 1, 8],
          ["playing", 2, 0],
          ["win", 7, 0, 2],

          ["playing", 0, 0],
          ["playing", 2, 0],
          ["playing", 2, 0],
          ["playing", 2, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:matching, match:, seat: i, player: players[i], status:, points:, misses:, rank:)
        end
      end

      it "上座優先で勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win lose win win
          playing win playing playing
        )
        expect(matchings.map(&:rank)).to eq [1, 8, 3, 2, nil, 4, nil, nil]
      end
    end
  end
end

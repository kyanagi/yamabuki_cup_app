require "rails_helper"

RSpec.describe MatchRule::Round2 do
  let(:match) { create(:match) }
  let(:match_rule) { MatchRule::Round2.new(match) }
  let!(:players) { create_list(:player, 14) }
  let!(:matchings) do
    Array.new(players.size) do |i|
      seat = i + 1
      status = if seat <= MatchRule::Round2::NUM_BUTTONS
                 "playing"
               else
                 "waiting"
               end
      create(:matching, match:, seat:, player: players[i], status:, points: 0, misses: 0)
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

    context "3回目の正解のとき" do
      it "勝利数が1増え、勝ち抜けになること" do
        matchings[0].update!(points: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq 3
        expect(matchings[0].status).to eq "win"
        expect(matchings[0].rank).to eq 1
      end

      it "勝ち抜けに伴い、待機列にいる最上位の選手が参加中になること" do
        matchings[0].update!(points: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process([question_player_result])

        moving_matching = matchings.select(&:status_waiting?).min_by(&:seat)
        moving_matching.reload
        expect(moving_matching.status).to eq "playing"
      end
    end

    context "誤答のとき" do
      it "誤答数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].points).to eq 0
        expect(matchings[0].misses).to eq 1
        expect(matchings[0].status).to eq "playing"
        expect(matchings[0].rank).to be_nil
      end
    end

    context "2回目の誤答のとき" do
      it "誤答数が1増え、失格になること" do
        matchings[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].misses).to eq 2
        expect(matchings[0].status).to eq "lose"
        expect(matchings[0].rank).to eq 14
      end

      it "失格に伴い、待機列にいる最上位の選手が参加中になること" do
        matchings[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])

        moving_matching = matchings.select(&:status_waiting?).min_by(&:seat)
        moving_matching.reload
        expect(moving_matching.status).to eq "playing"
      end

      it "失格者を除いたうちで最下位の順位がつくこと" do
        matchings[1].update!(status: "lose", rank: 14)
        matchings[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])
        matchings[0].reload
        expect(matchings[0].rank).to eq 13
      end
    end

    context "トビ残りになったとき" do
      let!(:matchings) do
        statuses = ["win"] + (["lose"] * 8) + (["playing"] * 5)
        Array.new(players.size) do |i|
          create(:matching, match:, seat: i + 1, player: players[i], status: statuses[i], points: 0, misses: 0)
        end
      end

      it "参加中の選手全員が勝ち抜けになること" do
        matchings[9].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[9], result: "wrong", situation: "pushed")
        match_rule.process([question_player_result])

        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq ["win"] + (["lose"] * 9) + (["win"] * 4)
      end
    end
  end

  describe "#judge_on_quiz_completed" do
    context "正解数に差がある場合" do
      let!(:matchings) do
        [
          ["win", 3, 0, 1],
          ["lose", 2, 2],
          ["win", 3, 0, 3],
          ["win", 3, 0, 2],
          ["playing", 0, 0],

          ["playing", 2, 0],
          ["playing", 2, 1],
          ["playing", 1, 0],
          ["playing", 0, 0],
          ["playing", 0, 0],

          ["playing", 0, 0],
          ["playing", 0, 0],
          ["playing", 0, 0],
          ["waiting", 0, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:matching, match:, seat: i + 1, player: players[i], status:, points:, misses:, rank:)
        end
      end

      it "正解数が多い順に勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win lose win win playing
          win win playing playing playing
          playing playing playing waiting
        )
        expect(matchings.map(&:rank)).to eq [1, nil, 3, 2, nil, 4, 5, nil, nil, nil, nil, nil, nil, nil]
      end
    end

    context "正解数が同じで、誤答数に差がある場合" do
      let!(:matchings) do
        [
          ["win", 3, 0, 1],
          ["lose", 2, 2],
          ["win", 3, 0, 3],
          ["win", 3, 0, 2],
          ["playing", 0, 0],

          ["playing", 1, 0],
          ["playing", 1, 1],
          ["playing", 1, 0],
          ["playing", 0, 0],
          ["playing", 0, 0],

          ["playing", 0, 0],
          ["playing", 0, 0],
          ["playing", 0, 0],
          ["waiting", 0, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:matching, match:, seat: i + 1, player: players[i], status:, points:, misses:, rank:)
        end
      end

      it "誤答数が少い順に勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win lose win win playing
          win playing win playing playing
          playing playing playing waiting
        )
        expect(matchings.map(&:rank)).to eq [1, nil, 3, 2, nil, 4, nil, 5, nil, nil, nil, nil, nil, nil]
      end
    end

    context "正解数も誤答数も同じ場合" do
      let!(:matchings) do
        [
          ["win", 3, 0, 1],
          ["lose", 2, 2],
          ["win", 3, 0, 3],
          ["win", 3, 0, 2],
          ["playing", 0, 0],

          ["playing", 2, 1],
          ["playing", 2, 1],
          ["playing", 2, 1],
          ["playing", 1, 0],
          ["playing", 0, 0],

          ["playing", 0, 0],
          ["playing", 0, 0],
          ["playing", 0, 0],
          ["waiting", 0, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:matching, match:, seat: i + 1, player: players[i], status:, points:, misses:, rank:)
        end
      end

      it "上座優先で勝ち抜け者が決定されること" do
        match_rule.judge_on_quiz_completed
        matchings.each(&:reload)
        expect(matchings.map(&:status)).to eq %w(
          win lose win win playing
          win win playing playing playing
          playing playing playing waiting
        )
        expect(matchings.map(&:rank)).to eq [1, nil, 3, 2, nil, 4, 5, nil, nil, nil, nil, nil, nil, nil]
      end
    end
  end
end

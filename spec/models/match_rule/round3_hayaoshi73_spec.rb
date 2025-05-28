require "rails_helper"

RSpec.describe MatchRule::Round3Hayaoshi73 do
  let(:round) { Round::ROUND3 }
  let(:rule_name) { "MatchRule::Round3Hayaoshi73" }
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

    context "7回目の正解のとき" do
      it "勝利数が1増え、勝ち抜けになること" do
        initial_scores[0].update!(points: 6)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 7
        expect(scores[0].status).to eq "win"
        expect(scores[0].rank).to eq 1
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

    context "3回目の誤答のとき" do
      it "誤答数が1増え、失格になること" do
        initial_scores[0].update!(misses: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].misses).to eq 3
        expect(scores[0].status).to eq "lose"
        expect(scores[0].rank).to eq 8
      end

      it "失格者を除いたうちで最下位の順位がつくこと" do
        initial_scores[1].update!(status: "lose", rank: 8)
        initial_scores[0].update!(misses: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].rank).to eq 7
      end
    end

    context "トビ残りになったとき" do
      let!(:initial_scores) do
        statuses = ["win"] + (["lose"] * 3) + (["playing"] * 4)
        Array.new(players.size) do |i|
          create(:score, score_operation: match_opening, matching: matchings[i], status: statuses[i], points: 0, misses: 0)
        end
      end

      it "参加中の選手全員が勝ち抜けになること" do
        initial_scores[4].update!(misses: 2)
        question_player_result = build(:question_player_result, player: players[4], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(win lose lose lose lose win win win)
      end
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    context "正解数に差がある場合" do
      let!(:initial_scores) do
        [
          ["win", 7, 0, 1],
          ["lose", 2, 3, 8],
          ["playing", 6, 2],
          ["win", 7, 0, 2],

          ["playing", 2, 0],
          ["playing", 5, 1],
          ["playing", 4, 0],
          ["playing", 0, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
        end
      end

      it "正解数が多い順に勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win lose win win
          playing win playing playing
        )
        expect(scores.map(&:rank)).to eq [1, 8, 3, 2, nil, 4, nil, nil]
      end
    end

    context "正解数が同じで、誤答数に差がある場合" do
      let!(:initial_scores) do
        [
          ["win", 7, 0, 1],
          ["lose", 2, 2, 8],
          ["win", 7, 0, 2],
          ["playing", 1, 2],

          ["playing", 0, 0],
          ["playing", 1, 1],
          ["playing", 1, 0],
          ["playing", 0, 0],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
        end
      end

      it "誤答数が少い順に勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win lose win playing
          playing win win playing
        )
        expect(scores.map(&:rank)).to eq [1, 8, 2, nil, nil, 4, 3, nil]
      end
    end

    context "正解数も誤答数も同じ場合" do
      let!(:initial_scores) do
        [
          ["win", 7, 0, 1],
          ["lose", 2, 3, 8],
          ["playing", 2, 1],
          ["win", 7, 0, 2],

          ["playing", 0, 0],
          ["playing", 2, 1],
          ["playing", 2, 1],
          ["playing", 2, 1],
        ].map.with_index do |(status, points, misses, rank), i|
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
        end
      end

      it "上座優先で勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win lose win win
          playing win playing playing
        )
        expect(scores.map(&:rank)).to eq [1, 8, 3, 2, nil, 4, nil, nil]
      end
    end
  end
end

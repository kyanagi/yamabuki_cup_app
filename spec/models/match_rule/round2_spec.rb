require "rails_helper"

RSpec.describe MatchRule::Round2 do
  let(:round) { Round::ROUND2 }
  let(:rule_name) { "MatchRule::Round2" }
  let(:match) { create(:match, round:, rule_name:) }
  let(:match_rule) { MatchRule::Round2.new(match) }
  let!(:players) { create_list(:player, 14) }
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
        expect(scores[0].points - initial_scores[0].points).to eq 1
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "3回目の正解のとき" do
      it "勝利数が1増え、勝ち抜けになること" do
        initial_scores[0].update!(points: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 3
        expect(scores[0].status).to eq "win"
        expect(scores[0].rank).to eq 1
      end

      it "勝ち抜けに伴い、待機列にいる最上位の選手が参加中になること" do
        initial_scores[0].update!(points: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        moving_seat = initial_scores.select(&:status_waiting?).map { it.matching.seat }.min
        scores = match_rule.instance_variable_get(:@scores)
        moving_score = scores.find { it.matching.seat == moving_seat }
        expect(moving_score.status).to eq "playing"
      end
    end

    context "誤答のとき" do
      it "誤答数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points - initial_scores[0].points).to eq 0
        expect(scores[0].misses).to eq 1
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "2回目の誤答のとき" do
      it "誤答数が1増え、失格になること" do
        initial_scores[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].misses).to eq 2
        expect(scores[0].status).to eq "lose"
        expect(scores[0].rank).to eq 14
      end

      it "失格に伴い、待機列にいる最上位の選手が参加中になること" do
        initial_scores[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        moving_seat = initial_scores.select(&:status_waiting?).map { |s| s.matching.seat }.min
        scores = match_rule.instance_variable_get(:@scores)
        moving_score = scores.find { |s| s.matching.seat == moving_seat }
        expect(moving_score.status).to eq "playing"
      end

      it "失格者を除いたうちで最下位の順位がつくこと" do
        initial_scores[1].update!(status: "lose", rank: 14)
        initial_scores[0].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].rank).to eq 13
      end
    end

    context "トビ残りになったとき" do
      let!(:initial_scores) do
        statuses = ["win"] + (["lose"] * 8) + (["playing"] * 5)
        Array.new(players.size) do |i|
          create(:score, score_operation: match_opening, matching: matchings[i], status: statuses[i], points: 0, misses: 0)
        end
      end

      it "参加中の選手全員が勝ち抜けになること" do
        initial_scores[9].update!(misses: 1)
        question_player_result = build(:question_player_result, player: players[9], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq ["win"] + (["lose"] * 9) + (["win"] * 4)
      end
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    context "正解数に差がある場合" do
      let!(:initial_scores) do
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
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
        end
      end

      it "正解数が多い順に勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win lose win win playing
          win win playing playing playing
          playing playing playing waiting
        )
        expect(scores.map(&:rank)).to eq [1, nil, 3, 2, nil, 4, 5, nil, nil, nil, nil, nil, nil, nil]
      end
    end

    context "正解数が同じで、誤答数に差がある場合" do
      let!(:initial_scores) do
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
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
        end
      end

      it "誤答数が少い順に勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win lose win win playing
          win playing win playing playing
          playing playing playing waiting
        )
        expect(scores.map(&:rank)).to eq [1, nil, 3, 2, nil, 4, nil, 5, nil, nil, nil, nil, nil, nil]
      end
    end

    context "正解数も誤答数も同じ場合" do
      let!(:initial_scores) do
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
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:, rank:)
        end
      end

      it "上座優先で勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win lose win win playing
          win win playing playing playing
          playing playing playing waiting
        )
        expect(scores.map(&:rank)).to eq [1, nil, 3, 2, nil, 4, 5, nil, nil, nil, nil, nil, nil, nil]
      end
    end
  end

  describe "#progress_summary" do
    it "現在の試合状況の概要を返すこと" do
      expect(match_rule.progress_summary).to eq "14→5／現在0人勝ち抜け、残り5人"
    end
  end
end

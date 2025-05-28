require "rails_helper"

RSpec.describe MatchRule::Quarterfinal do
  let(:round) { Round::QUARTERFINAL }
  let(:rule_name) { "MatchRule::Quarterfinal" }
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
      it "得点が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 1
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "100回目の正解をしたとき" do
      it "得点が1増え、参加中のままであること" do
        initial_scores[0].update!(points: 99)
        question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq 100
        expect(scores[0].misses).to eq 0
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "誤答のとき" do
      it "得点が1減り、誤答数が1増え、参加中のままであること" do
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq(-1)
        expect(scores[0].misses).to eq 1
        expect(scores[0].status).to eq "playing"
        expect(scores[0].rank).to be_nil
      end
    end

    context "3回目の誤答のとき" do
      it "得点が1減り、誤答数が1増え、待機中になること" do
        initial_scores[0].update!(misses: 2)
        question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
        match_rule.process_question_closing(question_closing, [question_player_result])

        scores = match_rule.instance_variable_get(:@scores)
        expect(scores[0].points).to eq(-1)
        expect(scores[0].misses).to eq 3
        expect(scores[0].status).to eq "waiting"
        expect(scores[0].rank).to be_nil
      end
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    context "得点に差がある場合" do
      let!(:initial_scores) do
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
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:)
        end
      end

      it "得点が多い順に勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win playing win win
          win playing playing playing
        )
        expect(scores.map(&:rank)).to eq [1, nil, 2, 4, 3, nil, nil, nil]
      end
    end

    context "得点が同じで、誤答数に差がある場合" do
      let!(:initial_scores) do
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
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:)
        end
      end

      it "誤答数が少ない順に勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          win win playing playing
          playing win win playing
        )
        expect(scores.map(&:rank)).to eq [2, 1, nil, nil, nil, 4, 3, nil]
      end
    end

    context "得点も誤答数も同じ場合" do
      let!(:initial_scores) do
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
          create(:score, score_operation: match_opening, matching: matchings[i], status:, points:, misses:)
        end
      end

      it "上座優先で勝ち抜け者が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:status)).to eq %w(
          playing playing playing win
          win win win playing
        )
        expect(scores.map(&:rank)).to eq [nil, nil, nil, 1, 2, 3, 4, nil]
      end
    end
  end
end

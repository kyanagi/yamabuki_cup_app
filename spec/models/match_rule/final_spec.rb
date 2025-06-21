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

  describe "#process_set_transition" do
    let(:set_transition) { build(:set_transition, match:) }
    let!(:initial_scores) do
      [
        create(:score, score_operation: match_opening, matching: matchings[0], status: "set_win", stars: 1, points: 3, misses: 0),
        create(:score, score_operation: match_opening, matching: matchings[1], status: "playing", stars: 2, points: 2, misses: 1),
        create(:score, score_operation: match_opening, matching: matchings[2], status: "waiting", stars: 0, points: 2, misses: 2),
        create(:score, score_operation: match_opening, matching: matchings[3], status: "playing", stars: 2, points: 1, misses: 1),
      ]
    end

    it "全員のstatusがplayingになり、pointsとmissesが0になること" do
      match_rule.process_set_transition(set_transition)

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores).to all have_attributes(status: "playing", points: 0, misses: 0)
    end

    it "starsの値は保持されること" do
      match_rule.process_set_transition(set_transition)

      scores = match_rule.instance_variable_get(:@scores)
      expect(scores.pluck(:stars)).to eq [1, 2, 0, 2]
    end
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

    context "スペシャル問題" do
      before do
        initial_scores[0].update!(status: "set_win")
      end

      context "正解のとき" do
        it "星が1増えること" do
          question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
          match_rule.process_question_closing(question_closing, [question_player_result])

          scores = match_rule.instance_variable_get(:@scores)
          expect(scores[0].stars).to eq 1
          expect(scores[0].status).to eq "set_win"
          expect(scores[0].rank).to be_nil
        end
      end

      context "7回目の正解のとき" do
        it "勝ち抜けになること" do
          initial_scores[0].update!(stars: 6)
          question_player_result = build(:question_player_result, player: players[0], result: "correct", situation: "pushed")
          match_rule.process_question_closing(question_closing, [question_player_result])

          scores = match_rule.instance_variable_get(:@scores)
          expect(scores[0].stars).to eq 7
          expect(scores[0].status).to eq "win"
          expect(scores[0].rank).to eq 1
        end
      end

      context "誤答のとき" do
        it "星が増えないこと" do
          question_player_result = build(:question_player_result, player: players[0], result: "wrong", situation: "pushed")
          match_rule.process_question_closing(question_closing, [question_player_result])

          scores = match_rule.instance_variable_get(:@scores)
          expect(scores[0].stars).to eq 0
          expect(scores[0].status).to eq "set_win"
          expect(scores[0].rank).to be_nil
        end
      end
    end
  end

  describe "#process_match_closing" do
    let(:match_closing) { build(:match_closing, match:) }

    context "★の数に差がある場合" do
      let!(:initial_scores) do
        [
          create(:score, score_operation: match_opening, matching: matchings[0], status: "playing", stars: 3),
          create(:score, score_operation: match_opening, matching: matchings[1], status: "playing", stars: 1),
          create(:score, score_operation: match_opening, matching: matchings[2], status: "playing", stars: 2),
          create(:score, score_operation: match_opening, matching: matchings[3], status: "playing", stars: 0),
        ]
      end

      it "★の数が多い順に順位が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:rank)).to eq [1, 3, 2, 4]
        expect(scores[0].status).to eq "win"
        expect(scores[1].status).to eq "playing"
        expect(scores[2].status).to eq "playing"
        expect(scores[3].status).to eq "playing"
      end
    end

    context "★の数が同じ場合" do
      let!(:initial_scores) do
        [
          create(:score, score_operation: match_opening, matching: matchings[0], status: "playing", stars: 2),
          create(:score, score_operation: match_opening, matching: matchings[1], status: "playing", stars: 2),
          create(:score, score_operation: match_opening, matching: matchings[2], status: "playing", stars: 1),
          create(:score, score_operation: match_opening, matching: matchings[3], status: "playing", stars: 1),
        ]
      end

      it "座席番号順（ペーパークイズ順位順）に順位が決定されること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:rank)).to eq [1, 2, 3, 4]
        expect(scores[0].status).to eq "win"
        expect(scores[1].status).to eq "playing"
        expect(scores[2].status).to eq "playing"
        expect(scores[3].status).to eq "playing"
      end
    end

    context "既に勝ち抜けている選手がいる場合" do
      let!(:initial_scores) do
        [
          create(:score, score_operation: match_opening, matching: matchings[0], status: "win", stars: 7, rank: 1),
          create(:score, score_operation: match_opening, matching: matchings[1], status: "playing", stars: 2),
          create(:score, score_operation: match_opening, matching: matchings[2], status: "playing", stars: 3),
          create(:score, score_operation: match_opening, matching: matchings[3], status: "playing", stars: 1),
        ]
      end

      it "勝ち抜け済み選手の順位は変更せず、残りの選手の順位を決定すること" do
        match_rule.process_match_closing(match_closing)
        scores = match_rule.instance_variable_get(:@scores)
        expect(scores.map(&:rank)).to eq [1, 3, 2, 4]
        expect(scores[0].status).to eq "win"
        expect(scores[1].status).to eq "playing"
        expect(scores[2].status).to eq "playing"
        expect(scores[3].status).to eq "playing"
      end
    end
  end
end

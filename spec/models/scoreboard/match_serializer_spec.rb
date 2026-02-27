require "rails_helper"

RSpec.describe Scoreboard::MatchSerializer do
  # 共通セットアップヘルパー
  def create_match_with_players(rule_name:, round_id:, player_count:)
    match = create(:match, rule_name:, round_id:)
    players = player_count.times.map do |i|
      player = create(:player)
      create(:player_profile, player:, family_name: "姓#{i}", given_name: "名#{i}",
                              family_name_kana: "せい", given_name_kana: "めい")
      create(:matching, match:, player:, seat: i)
      player
    end
    [match, players]
  end

  def create_initial_scores(match, score_operation)
    match.matchings.order(:seat).map do |matching|
      create(:score, matching:, score_operation:, status: "playing", points: 0, misses: 0, rank: nil)
    end
  end

  describe "#as_json (board ルール)" do
    let(:round) { Round::SEMIFINAL }
    let(:match) { create(:match, rule_name: "MatchRule::Semifinal", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:,
                              family_name: "山田", given_name: "太郎",
                              family_name_kana: "やまだ", given_name_kana: "たろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 3, misses: 1, rank: nil) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "ruleTemplateが'board'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:ruleTemplate]).to eq "board"
    end

    it "gridClassが'match-scorelist-column1'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:gridClass]).to eq "match-scorelist-column1"
    end

    it "footerLabelがmatch.full_nameと一致する" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:footerLabel]).to eq match.full_name
    end

    it "nameにscoreboard_full_nameを使用する" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:name]).to eq profile.scoreboard_full_name
    end

    it "nameLength が名前の文字数と一致する" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:nameLength]).to eq profile.scoreboard_full_name.size
    end

    it "scoreChangedがscore.score_changed?を反映する" do
      score.mark_as_score_changed
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:scoreChanged]).to be true
    end

    it "scoreChangedがfalseのとき" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:scoreChanged]).to be false
    end
  end

  describe "#as_json (round2 ルール)" do
    let(:round) { Round::ROUND2 }
    let(:match) { create(:match, rule_name: "MatchRule::Round2Omote", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "田中", given_name: "花子",
                              family_name_kana: "たなか", given_name_kana: "はなこ")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 1, misses: 0) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "ruleTemplateが'round2'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:ruleTemplate]).to eq "round2"
    end

    it "gridClassが'match-scorelist-column2'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:gridClass]).to eq "match-scorelist-column2"
    end

    it "nameにfamily_nameを使用する" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:name]).to eq profile.family_name
    end
  end

  describe "#as_json (playoff ルール)" do
    let(:round) { Round::PLAYOFF }
    let(:match) { create(:match, rule_name: "MatchRule::Playoff", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "鈴木", given_name: "次郎",
                              family_name_kana: "すずき", given_name_kana: "じろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 10, misses: 0) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "ruleTemplateが'playoff'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:ruleTemplate]).to eq "playoff"
    end

    it "gridClassが'match-scorelist-column2-row5'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:gridClass]).to eq "match-scorelist-column2-row5"
    end

    it "nameにfamily_nameを使用する" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:name]).to eq profile.family_name
    end
  end

  describe "#as_json (hayaoshi ルール)" do
    let(:round) { Round::QUARTERFINAL }
    let(:match) { create(:match, rule_name: "MatchRule::Quarterfinal", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "佐藤", given_name: "三郎",
                              family_name_kana: "さとう", given_name_kana: "さぶろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 2, misses: 1) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "ruleTemplateが'hayaoshi'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:ruleTemplate]).to eq "hayaoshi"
    end

    it "gridClassが'match-scorelist-column1'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:gridClass]).to eq "match-scorelist-column1"
    end

    it "nameにscoreboard_full_nameを使用する" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:name]).to eq profile.scoreboard_full_name
    end
  end

  describe "#as_json (hayabo ルール)" do
    let(:round) { Round::ROUND3 }
    let(:match) { create(:match, rule_name: "MatchRule::Round3Hayabo", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "伊藤", given_name: "四郎",
                              family_name_kana: "いとう", given_name_kana: "しろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 5, misses: 0) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "ruleTemplateが'hayabo'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:ruleTemplate]).to eq "hayabo"
    end

    it "gridClassが'match-scorelist-column1'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:gridClass]).to eq "match-scorelist-column1"
    end
  end

  describe "#as_json (final ルール)" do
    let(:round) { Round::FINAL }
    let(:match) { create(:match, rule_name: "MatchRule::Final", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "渡辺", given_name: "五郎",
                              family_name_kana: "わたなべ", given_name_kana: "ごろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "set_win", points: 3, misses: 0, rank: nil, stars: 2) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "ruleTemplateが'final'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:ruleTemplate]).to eq "final"
    end

    it "gridClassが'match-scorelist-column1'になる" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:gridClass]).to eq "match-scorelist-column1"
    end

    it "starsが正しく含まれる" do
      result = described_class.new(match, [score], score_operation).as_json
      entry = result[:scores].first
      expect(entry[:stars]).to eq 2
    end
  end

  # QuestionClosing は transfer_attributes コールバックで自前の question_result を作成するため、
  # previousResult/previousSituation のテストでは ScoreOperation 基底クラスを使い、
  # question_result_id を手動で設定してテストする。
  describe "previousResult のロジック" do
    let(:round) { Round::QUARTERFINAL }
    let(:match) { create(:match, rule_name: "MatchRule::Quarterfinal", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "小林", given_name: "六郎",
                              family_name_kana: "こばやし", given_name_kana: "ろくろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:question_allocation) { create(:question_allocation, match:) }
    let(:question_result) { create(:question_result, question_allocation:) }

    before { profile }

    # score_operation は ScoreOperation 基底クラスで question_result_id を手動セット
    def build_score_operation_with_qpr(match:, question_result:, player:, situation:, result:)
      create(:question_player_result, question_result:, player:, situation:, result:)
      op = create(:score_operation, match:)
      op.update_column(:question_result_id, question_result.id)
      op.reload
    end

    context "pushed かつ correct の場合" do
      let(:score_operation) do
        build_score_operation_with_qpr(match:, question_result:, player:, situation: "pushed", result: "correct")
      end
      let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 1, misses: 0) }

      it "previousResultが'correct'になる" do
        result = described_class.new(match, [score], score_operation).as_json
        expect(result[:scores].first[:previousResult]).to eq "correct"
      end
    end

    context "pushed かつ wrong の場合" do
      let(:score_operation) do
        build_score_operation_with_qpr(match:, question_result:, player:, situation: "pushed", result: "wrong")
      end
      let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 0, misses: 1) }

      it "previousResultが'wrong'になる" do
        result = described_class.new(match, [score], score_operation).as_json
        expect(result[:scores].first[:previousResult]).to eq "wrong"
      end
    end

    context "pushed でない場合" do
      let(:score_operation) do
        build_score_operation_with_qpr(match:, question_result:, player:, situation: "unpushed", result: "correct")
      end
      let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 0, misses: 0) }

      it "previousResultがnilになる" do
        result = described_class.new(match, [score], score_operation).as_json
        expect(result[:scores].first[:previousResult]).to be_nil
      end
    end

    context "question_player_result がない場合" do
      let(:score) { create(:score, matching:, score_operation: create(:score_operation, match:), status: "playing", points: 0, misses: 0) }

      it "previousResultがnilになる" do
        result = described_class.new(match, [score], nil).as_json
        expect(result[:scores].first[:previousResult]).to be_nil
      end
    end
  end

  describe "previousSituation のロジック（hayabo）" do
    let(:round) { Round::ROUND3 }
    let(:match) { create(:match, rule_name: "MatchRule::Round3Hayabo", round_id: round.id) }
    let(:player) { create(:player) }
    let(:profile) do
      create(:player_profile, player:, family_name: "加藤", given_name: "七郎",
                              family_name_kana: "かとう", given_name_kana: "しちろう")
    end
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:question_allocation) { create(:question_allocation, match:) }
    let(:question_result) { create(:question_result, question_allocation:) }

    before { profile }

    def build_score_operation_with_qpr(match:, question_result:, player:, situation:, result:)
      create(:question_player_result, question_result:, player:, situation:, result:)
      op = create(:score_operation, match:)
      op.update_column(:question_result_id, question_result.id)
      op.reload
    end

    context "pushed の場合" do
      let(:score_operation) do
        build_score_operation_with_qpr(match:, question_result:, player:, situation: "pushed", result: "correct")
      end
      let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 0, misses: 0) }

      it "previousSituationが'pushed'になる" do
        result = described_class.new(match, [score], score_operation).as_json
        expect(result[:scores].first[:previousSituation]).to eq "pushed"
      end
    end

    context "unpushed の場合" do
      let(:score_operation) do
        build_score_operation_with_qpr(match:, question_result:, player:, situation: "unpushed", result: "correct")
      end
      let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 0, misses: 0) }

      it "previousSituationが'unpushed'になる" do
        result = described_class.new(match, [score], score_operation).as_json
        expect(result[:scores].first[:previousSituation]).to eq "unpushed"
      end
    end
  end

  describe "scoreOperationId" do
    let(:match) { create(:match, rule_name: "MatchRule::Semifinal", round_id: Round::SEMIFINAL.id) }
    let(:player) { create(:player) }
    let(:profile) { create(:player_profile, player:) }
    let(:matching) { create(:matching, match:, player:, seat: 0) }
    let(:score_operation) { create(:score_operation, match:) }
    let(:score) { create(:score, matching:, score_operation:, status: "playing", points: 0, misses: 0) }

    before do
      profile
      match.update!(last_score_operation: score_operation)
    end

    it "scoreOperationIdがscore_operation.idと一致する" do
      result = described_class.new(match, [score], score_operation).as_json
      expect(result[:scoreOperationId]).to eq score_operation.id
    end

    it "score_operationがnilのときscoreOperationIdがnilになる" do
      result = described_class.new(match, [score], nil).as_json
      expect(result[:scoreOperationId]).to be_nil
    end
  end
end

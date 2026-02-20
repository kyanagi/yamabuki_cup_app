require "rails_helper"

RSpec.describe ScoreFreeEditInput, type: :model do
  def create_match_with_participants(rule_name:, count: nil)
    rule_class = rule_name.constantize
    match = create(:match, rule_name: rule_name)
    matchings = (count || rule_class::NUM_SEATS).times.map do |i|
      create(:matching, match: match, seat: i + 1)
    end
    MatchOpening.create!(match: match)
    [match.reload, matchings]
  end

  def editable_score_params_from(match, matchings)
    editable_fields = described_class.editable_fields_for(match.rule_class)
    current_scores = match.current_scores.index_by(&:matching_id)

    matchings.each_with_object({}) do |matching, hash|
      score = current_scores.fetch(matching.id)
      params = {}
      params[:status] = score.status if editable_fields.include?(:status)
      params[:points] = score.points.to_s if editable_fields.include?(:points)
      params[:misses] = score.misses.to_s if editable_fields.include?(:misses)
      params[:rank] = score.rank&.to_s if editable_fields.include?(:rank)
      params[:stars] = score.stars.to_s if editable_fields.include?(:stars)
      hash[matching.id.to_s] = params
    end
  end

  describe "バリデーション" do
    [
      "MatchRule::Round2Omote",
      "MatchRule::Round3Hayaoshi71",
      "MatchRule::Round3Hayaoshi73",
      "MatchRule::Quarterfinal",
      "MatchRule::Round3Hayabo",
      "MatchRule::Round3Hayabo2",
      "MatchRule::Semifinal",
      "MatchRule::Playoff",
      "MatchRule::Final",
    ].each do |rule_name|
      it "#{rule_name} の有効な入力は妥当" do
        match, matchings = create_match_with_participants(rule_name: rule_name)

        input = described_class.new(match: match, scores_by_matching_id: editable_score_params_from(match, matchings))

        expect(input).to be_valid
      end
    end

    it "2R裏は対象外でエラーになる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round2Ura")

      input = described_class.new(match: match, scores_by_matching_id: editable_score_params_from(match, matchings))

      expect(input).not_to be_valid
      expect(input.errors[:match]).to be_present
    end

    it "対象試合外のmatching_idが含まれるとエラーになる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round2Omote")
      other_match, other_matchings = create_match_with_participants(rule_name: "MatchRule::Round2Omote", count: 1)

      params = editable_score_params_from(match, matchings)
      params[other_matchings.first.id.to_s] = editable_score_params_from(other_match, other_matchings).values.first

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input).not_to be_valid
      expect(input.errors[:base]).to be_present
    end

    it "Quarterfinal で許可されないstatusはエラーになる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Quarterfinal")
      params = editable_score_params_from(match, matchings)
      params[matchings.first.id.to_s][:status] = "lose"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input).not_to be_valid
      expect(input.errors[:base]).to be_present
    end

    it "Semifinal で許可されないstatusはエラーになる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Semifinal")
      params = editable_score_params_from(match, matchings)
      params[matchings.first.id.to_s][:status] = "waiting"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input).not_to be_valid
      expect(input.errors[:base]).to be_present
    end

    it "Final で許可されないstatusはエラーになる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Final")
      params = editable_score_params_from(match, matchings)
      params[matchings.first.id.to_s][:status] = "lose"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input).not_to be_valid
      expect(input.errors[:base]).to be_present
    end

    it "rankの重複や欠番は許可される" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round2Omote")
      params = editable_score_params_from(match, matchings)
      params[matchings[0].id.to_s][:rank] = "1"
      params[matchings[1].id.to_s][:rank] = "1"
      params[matchings[2].id.to_s][:rank] = ""
      params[matchings[3].id.to_s][:rank] = "7"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input).to be_valid
    end
  end

  describe "#save" do
    it "有効な入力ならScoreFreeEditOperationを保存する" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round2Omote")

      input = described_class.new(match: match, scores_by_matching_id: editable_score_params_from(match, matchings))

      expect { input.save }.to change(ScoreFreeEditOperation, :count).by(1)
    end

    it "無効な入力なら保存しない" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round2Omote")
      params = editable_score_params_from(match, matchings)
      params[matchings.first.id.to_s][:status] = "set_win"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect { input.save }.not_to change(ScoreFreeEditOperation, :count)
    end

    it "非編集項目（Round3Hayaboのmisses）は更新されない" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round3Hayabo")
      params = editable_score_params_from(match, matchings)
      params[matchings.first.id.to_s][:misses] = "99"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input.save).to be(true)

      saved_score = match.reload.last_score_operation.scores.find_by!(matching: matchings.first)
      expect(saved_score.misses).to eq(0)
    end

    it "Finalではstarsを更新できる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Final")
      params = editable_score_params_from(match, matchings)
      params[matchings.first.id.to_s][:stars] = "5"

      input = described_class.new(match: match, scores_by_matching_id: params)

      expect(input.save).to be(true)

      saved_score = match.reload.last_score_operation.scores.find_by!(matching: matchings.first)
      expect(saved_score.stars).to eq(5)
    end
  end
end

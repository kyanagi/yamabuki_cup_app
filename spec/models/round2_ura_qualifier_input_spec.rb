require "rails_helper"

RSpec.describe Round2UraQualifierInput, type: :model do
  def create_round2_ura_match_with_participants(count: 12)
    match = create(:match, rule_name: "MatchRule::Round2Ura")
    matchings = count.times.map do |i|
      create(:matching, match: match, seat: i + 1)
    end
    MatchOpening.create!(match: match)
    [match.reload, matchings]
  end

  def valid_rank_by_matching_id(matchings)
    {
      matchings[0].id.to_s => "1",
      matchings[1].id.to_s => "2",
      matchings[2].id.to_s => "3",
      matchings[3].id.to_s => "4",
    }
  end

  describe "バリデーション" do
    context "有効な入力の場合" do
      it "4名の勝抜け者と順位1〜4が正しく設定されていれば有効" do
        match, matchings = create_round2_ura_match_with_participants

        input = Round2UraQualifierInput.new(
          match: match,
          rank_by_matching_id: valid_rank_by_matching_id(matchings)
        )

        expect(input).to be_valid
      end
    end

    context "対象試合が2R裏でない場合" do
      it "エラーになる" do
        match = create(:match, rule_name: "MatchRule::Round2Omote")
        matchings = 10.times.map { |i| create(:matching, match: match, seat: i + 1) }
        MatchOpening.create!(match: match)

        input = Round2UraQualifierInput.new(
          match: match.reload,
          rank_by_matching_id: valid_rank_by_matching_id(matchings)
        )

        expect(input).not_to be_valid
        expect(input.errors[:match]).to be_present
      end
    end

    context "勝抜け者が4名でない場合" do
      it "3名の場合エラーになる" do
        match, matchings = create_round2_ura_match_with_participants

        input = Round2UraQualifierInput.new(
          match: match,
          rank_by_matching_id: {
            matchings[0].id.to_s => "1",
            matchings[1].id.to_s => "2",
            matchings[2].id.to_s => "3",
          }
        )

        expect(input).not_to be_valid
        expect(input.errors[:base]).to be_present
      end

      it "5名の場合エラーになる" do
        match, matchings = create_round2_ura_match_with_participants

        input = Round2UraQualifierInput.new(
          match: match,
          rank_by_matching_id: {
            matchings[0].id.to_s => "1",
            matchings[1].id.to_s => "2",
            matchings[2].id.to_s => "3",
            matchings[3].id.to_s => "4",
            matchings[4].id.to_s => "1",
          }
        )

        expect(input).not_to be_valid
      end
    end

    context "同順位がある場合" do
      it "エラーになる" do
        match, matchings = create_round2_ura_match_with_participants

        input = Round2UraQualifierInput.new(
          match: match,
          rank_by_matching_id: {
            matchings[0].id.to_s => "1",
            matchings[1].id.to_s => "1",
            matchings[2].id.to_s => "2",
            matchings[3].id.to_s => "3",
          }
        )

        expect(input).not_to be_valid
        expect(input.errors[:base]).to be_present
      end
    end

    context "順位1〜4のいずれかが欠落している場合" do
      it "エラーになる" do
        match, matchings = create_round2_ura_match_with_participants

        input = Round2UraQualifierInput.new(
          match: match,
          rank_by_matching_id: {
            matchings[0].id.to_s => "1",
            matchings[1].id.to_s => "2",
            matchings[2].id.to_s => "3",
            matchings[3].id.to_s => "5",
          }
        )

        expect(input).not_to be_valid
        expect(input.errors[:base]).to be_present
      end
    end

    context "対象外参加者が含まれる場合" do
      it "エラーになる" do
        match, matchings = create_round2_ura_match_with_participants
        other_match = create(:match, rule_name: "MatchRule::Round2Ura")
        other_matching = create(:matching, match: other_match, seat: 1)
        MatchOpening.create!(match: other_match)

        input = Round2UraQualifierInput.new(
          match: match,
          rank_by_matching_id: {
            matchings[0].id.to_s => "1",
            matchings[1].id.to_s => "2",
            matchings[2].id.to_s => "3",
            other_matching.id.to_s => "4",
          }
        )

        expect(input).not_to be_valid
        expect(input.errors[:base]).to be_present
      end
    end
  end

  describe "#save" do
    it "有効な入力ならScoreが保存される" do
      match, matchings = create_round2_ura_match_with_participants

      input = Round2UraQualifierInput.new(
        match: match,
        rank_by_matching_id: valid_rank_by_matching_id(matchings)
      )

      expect do
        input.save
      end.to change(Round2UraQualifierUpdate, :count).by(1)
    end

    it "無効な入力ならScoreは保存されない" do
      match, matchings = create_round2_ura_match_with_participants

      input = Round2UraQualifierInput.new(
        match: match,
        rank_by_matching_id: {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
        }
      )

      expect do
        input.save
      end.not_to change(Round2UraQualifierUpdate, :count)
    end
  end
end

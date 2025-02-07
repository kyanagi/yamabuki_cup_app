require "rails_helper"

RSpec.describe Round, type: :model do
  describe "#matches" do
    let(:round) { Round::ROUND2 }
    let(:round2_matches) { create_list(:match, 5, round:) }

    before do
      create(:match, round: Round::ROUND3)
    end

    it "関連するMatchが取得できること" do
      expect(round.matches).to match_array(round2_matches)
    end
  end

  describe "#matchings" do
    let(:round2_match) { create(:match, round: Round::ROUND2) }
    let(:round3_match) { create(:match, round: Round::ROUND3) }

    let!(:round2_matchings) { create_list(:matching, 5, match: round2_match) }

    before do
      create_list(:matching, 5, match: round3_match)
    end

    it "関連するMatchingが取得できること" do
      round = Round::ROUND2
      expect(round.matchings).to match_array(round2_matchings)
    end
  end
end

require "rails_helper"

RSpec.describe Round, type: :model do
  describe "#matches" do
    it "関連するMatchが取得できること" do
      round = Round::ROUND2
      expect(round.matches.pluck(:id)).to contain_exactly(21, 22, 23, 24, 25)
    end
  end

  describe "#matchings" do
    let(:round2_match) { Match.find(21) }
    let(:round3_match) { Match.find(31) }

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

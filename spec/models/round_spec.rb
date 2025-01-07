require "rails_helper"

RSpec.describe Round, type: :model do
  describe "#matches" do
    it "関連するMatchが取得できること" do
      round = Round.find(2)
      expect(round.matches.pluck(:id)).to contain_exactly(21, 22, 23, 24, 25)
    end
  end
end

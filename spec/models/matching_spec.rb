require "rails_helper"

RSpec.describe Matching, type: :model do
  let(:matching) { create(:matching) }

  describe ".belongs_to" do
    it "関連するレコードが取得できること" do
      expect(matching.match).to be_a(Match)
      expect(matching.player).to be_a(Player)
    end
  end
end

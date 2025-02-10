require "rails_helper"

RSpec.describe PlayerProfile, type: :model do
  describe "#player" do
    let(:profile) { create(:player_profile) }

    it "Playerを返すこと" do
      expect(profile.player).to be_a(Player)
    end
  end
end

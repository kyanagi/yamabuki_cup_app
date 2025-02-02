require "rails_helper"

RSpec.describe YontakuPlayerResult, type: :model do
  describe "#player" do
    let(:yontaku_player_result) { create(:yontaku_player_result) }

    it "playerを返すこと" do
      expect(yontaku_player_result.player).to be_a(Player)
    end
  end
end

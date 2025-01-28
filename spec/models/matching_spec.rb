require "rails_helper"

RSpec.describe Matching, type: :model do
  let(:matching) { create(:matching) }

  describe ".belongs_to" do
    it "関連するレコードが取得できること" do
      expect(matching.match).to be_a(Match)
      expect(matching.player).to be_a(Player)
    end
  end

  describe ".highest_vacant_rank" do
    subject { Matching.highest_vacant_rank(match) }
    let(:match) { create(:match) }
    let!(:matchings) { create_list(:matching, 5, match:) }

    it "rankが埋まっている選手がいないとき、1を返すこと" do
      expect(subject).to eq 1
    end

    it "rankが埋まっている選手がいるとき、埋まっていない最小のrankを返すこと" do
      matchings[0].update!(rank: 1)
      matchings[1].update!(rank: 2)
      matchings[2].update!(rank: 5)
      expect(subject).to eq 3
    end
  end

  describe ".lowest_vacant_rank" do
    subject { Matching.lowest_vacant_rank(match) }
    let(:match) { create(:match) }
    let!(:matchings) { create_list(:matching, 5, match:) }

    it "rankが埋まっている選手がいないとき、matchings.countを返すこと" do
      expect(subject).to eq 5
    end

    it "rankが埋まっている選手がいるとき、埋まっていない最大のrankを返すこと" do
      matchings[0].update!(rank: 1)
      matchings[1].update!(rank: 5)
      expect(subject).to eq 4
    end
  end
end

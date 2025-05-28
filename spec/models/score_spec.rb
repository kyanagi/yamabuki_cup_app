require "rails_helper"

RSpec.describe Score, type: :model do
  describe ".highest_vacant_rank" do
    it "rankが埋まっている選手がいないとき、1を返すこと" do
      scores = build_list(:score, 5)
      expect(Score.highest_vacant_rank(scores)).to eq 1
    end

    it "rankが埋まっている選手がいるとき、埋まっていない最小のrankを返すこと" do
      scores = [
        build(:score, rank: 1),
        build(:score, rank: 2),
        build(:score, rank: 5),
        build(:score, rank: nil),
        build(:score, rank: nil),
      ]
      expect(Score.highest_vacant_rank(scores)).to eq 3
    end
  end

  describe ".lowest_vacant_rank" do
    it "rankが埋まっている選手がいないとき、scores.countを返すこと" do
      scores = build_list(:score, 5)
      expect(Score.lowest_vacant_rank(scores)).to eq 5
    end

    it "rankが埋まっている選手がいるとき、埋まっていない最大のrankを返すこと" do
      scores = [
        build(:score, rank: 1),
        build(:score, rank: 5),
        build(:score, rank: nil),
        build(:score, rank: nil),
        build(:score, rank: nil),
      ]
      expect(Score.lowest_vacant_rank(scores)).to eq 4
    end
  end
end

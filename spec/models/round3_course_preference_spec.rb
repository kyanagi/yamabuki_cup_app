require "rails_helper"

RSpec.describe Round3CoursePreference, type: :model do
  describe "#player" do
    subject { create(:round3_course_preference, player:) }
    let(:player) { create(:player) }

    it "Playerが取得できること" do
      expect(subject.player).to eq player
    end
  end

  describe "#choices" do
    let(:round) { Round::ROUND3 }
    let(:matches) { create_list(:match, 4, round:) }

    subject do
      create(
        :round3_course_preference,
        choice1_match: matches[1],
        choice2_match: matches[0],
        choice3_match: matches[3],
        choice4_match: matches[2]
      )
    end

    it "選択したMatchが取得できること" do
      expect(subject.choices).to eq [matches[1], matches[0], matches[3], matches[2]]
    end
  end
end

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

  describe "バリデーション" do
    let(:round) { Round::ROUND3 }
    let(:match) { create(:match, round:) }

    context "選択したコースに重複がある場合" do
      subject do
        build(
          :round3_course_preference,
          choice1_match: match,
          choice2_match: match,
          choice3_match: match,
          choice4_match: match
        )
      end

      it "無効であること" do
        expect(subject).not_to be_valid
        expect(subject.errors[:base]).to include("選択したコースに重複があります")
      end
    end

    context "選択したコースに重複がない場合" do
      let(:matches) { create_list(:match, 4, round:) }

      subject do
        build(
          :round3_course_preference,
          choice1_match: matches[0],
          choice2_match: matches[1],
          choice3_match: matches[2],
          choice4_match: matches[3]
        )
      end

      it "有効であること" do
        expect(subject).to be_valid
      end
    end
  end
end

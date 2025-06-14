require "rails_helper"

RSpec.describe Setting, type: :model do
  describe ".registerable" do
    it "デフォルトでtrueを返す" do
      expect(Setting.registerable).to be true
    end

    it "保存された値を返す" do
      Setting.update!(registerable: false)
      expect(Setting.registerable).to be false
    end
  end

  describe ".round3_course_preference_editable" do
    it "デフォルトでtrueを返す" do
      expect(Setting.round3_course_preference_editable).to be true
    end

    it "保存された値を返す" do
      Setting.update!(round3_course_preference_editable: false)
      expect(Setting.round3_course_preference_editable).to be false
    end
  end

  describe ".update!" do
    it "設定を更新できる" do
      expect do
        Setting.update!(registerable: false, round3_course_preference_editable: false)
      end.to change { Setting.registerable }.from(true).to(false)
        .and change { Setting.round3_course_preference_editable }.from(true).to(false)
    end
  end
end

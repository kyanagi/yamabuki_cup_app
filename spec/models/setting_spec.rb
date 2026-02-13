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

  describe ".capacity" do
    it "デフォルトで0を返す" do
      expect(Setting.capacity).to eq(0)
    end

    it "保存された値を返す" do
      Setting.update!(capacity: 100)
      expect(Setting.capacity).to eq(100)
    end

    it "0未満は受け付けない" do
      expect { Setting.update!(capacity: -1) }.to raise_error(ArgumentError)
    end
  end

  describe ".entry_phase" do
    it "デフォルトでnilを返す" do
      expect(Setting.entry_phase).to be_nil
    end

    it "primary を保存できる" do
      Setting.update!(entry_phase: "primary")
      expect(Setting.entry_phase).to eq("primary")
    end

    it "secondary を保存できる" do
      Setting.update!(entry_phase: "secondary")
      expect(Setting.entry_phase).to eq("secondary")
    end

    it "primary / secondary 以外は受け付けない" do
      expect { Setting.update!(entry_phase: "invalid") }.to raise_error(ArgumentError)
    end
  end

  describe ".update!" do
    it "設定を更新できる" do
      expect do
        Setting.update!(
          registerable: false,
          round3_course_preference_editable: false,
          capacity: 10,
          entry_phase: "primary"
        )
      end.to change { Setting.registerable }.from(true).to(false)
        .and change { Setting.round3_course_preference_editable }.from(true).to(false)
        .and change { Setting.capacity }.from(0).to(10)
        .and change { Setting.entry_phase }.from(nil).to("primary")
    end
  end
end

require "rails_helper"

RSpec.describe EntryCancellationForm, type: :model do
  describe "#save" do
    it "確認テキストが一致したときにキャンセルできる" do
      entry = create(:entry, status: :pending)
      form = described_class.new(entry:, confirmation_text: "キャンセル")

      expect(form.save).to be(true)
      expect(entry.reload).to be_cancelled
    end

    it "確認テキストが一致しないとキャンセルできない" do
      entry = create(:entry, status: :pending)
      form = described_class.new(entry:, confirmation_text: "キャンセルします")

      expect(form.save).to be(false)
      expect(form.errors[:confirmation_text]).to include("「キャンセル」と入力してください。")
      expect(entry.reload).to be_pending
    end

    it "entry がないとキャンセルできない" do
      form = described_class.new(entry: nil, confirmation_text: "キャンセル")

      expect(form.save).to be(false)
      expect(form.errors[:base]).to include("エントリー情報が見つかりません。")
    end

    it "既にキャンセル済みの entry はキャンセルできない" do
      entry = create(:entry, status: :cancelled)
      form = described_class.new(entry:, confirmation_text: "キャンセル")

      expect(form.save).to be(false)
      expect(form.errors[:base]).to include("既にキャンセル済みです。")
    end
  end
end

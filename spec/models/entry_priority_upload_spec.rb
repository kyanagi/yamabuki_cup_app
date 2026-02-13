require "rails_helper"

RSpec.describe EntryPriorityUpload, type: :model do
  describe "バリデーション" do
    it "CSVデータが必須であること" do
      upload = described_class.new

      expect(upload).not_to be_valid
      expect(upload.errors[:csv_data]).to include("を入力してください")
    end

    it "各行が2列でない場合は無効であること" do
      upload = described_class.new(csv_data: "1,2,3\n")

      expect(upload).not_to be_valid
      expect(upload.errors[:base]).to include("CSVの形式が正しくありません。")
    end
  end

  describe "#save" do
    before do
      Setting.update!(capacity: 2)
    end

    it "優先順位を更新し、status を再計算すること" do
      entry1 = create(:entry, status: :pending, priority: nil)
      entry2 = create(:entry, status: :pending, priority: nil)
      entry3 = create(:entry, status: :waitlisted, priority: nil)

      upload = described_class.new(csv_data: <<~CSV)
        #{entry1.id},2
        #{entry2.id},1
      CSV

      expect(upload.save).to be true
      expect(upload.updated_count).to eq(2)

      expect(entry1.reload.priority).to eq(2)
      expect(entry2.reload.priority).to eq(1)
      expect(entry3.reload.priority).to be_nil

      expect(entry1).to be_accepted
      expect(entry2).to be_accepted
      expect(entry3).to be_pending
    end

    it "DBに存在しないIDが含まれる場合はロールバックすること" do
      entry = create(:entry, status: :accepted, priority: 10)
      create(:entry, status: :waitlisted, priority: 20)

      upload = described_class.new(csv_data: <<~CSV)
        #{entry.id},1
        999999,2
      CSV

      expect(upload.save).to be false
      expect(upload.errors[:base]).to include("CSVに存在しないIDが含まれています。")
      expect(entry.reload.priority).to eq(10)
      expect(entry).to be_accepted
    end

    it "CSV内でIDが重複する場合は無効であること" do
      entry = create(:entry)

      upload = described_class.new(csv_data: <<~CSV)
        #{entry.id},1
        #{entry.id},2
      CSV

      expect(upload.save).to be false
      expect(upload.errors[:base]).to include("CSV内でIDが重複しています。")
    end

    it "CSV内で優先順位が重複する場合は無効であること" do
      entry1 = create(:entry)
      entry2 = create(:entry)

      upload = described_class.new(csv_data: <<~CSV)
        #{entry1.id},1
        #{entry2.id},1
      CSV

      expect(upload.save).to be false
      expect(upload.errors[:base]).to include("CSV内で優先順位が重複しています。")
    end

    it "CSV外のエントリーと優先順位が衝突する場合は無効であること" do
      entry1 = create(:entry, priority: nil)
      create(:entry, priority: 7)

      upload = described_class.new(csv_data: <<~CSV)
        #{entry1.id},7
      CSV

      expect(upload.save).to be false
      expect(upload.errors[:base]).to include("CSV外のエントリーと優先順位が重複しています。")
    end

    it "cancelled は status を維持したまま priority を更新すること" do
      cancelled = create(:entry, status: :cancelled, priority: 30)
      active = create(:entry, status: :waitlisted, priority: 10)
      pending = create(:entry, status: :waitlisted, priority: nil)
      Setting.update!(capacity: 1)

      upload = described_class.new(csv_data: <<~CSV)
        #{cancelled.id},1
      CSV

      expect(upload.save).to be true

      expect(cancelled.reload.priority).to eq(1)
      expect(cancelled).to be_cancelled
      expect(active.reload).to be_accepted
      expect(pending.reload).to be_pending
    end

    it "priority が nil の非cancelledは pending になること" do
      prioritized = create(:entry, status: :accepted, priority: 1)
      nil_priority = create(:entry, status: :waitlisted, priority: nil)
      Setting.update!(capacity: 1)

      upload = described_class.new(csv_data: <<~CSV)
        #{prioritized.id},2
      CSV

      expect(upload.save).to be true
      expect(nil_priority.reload).to be_pending
    end

    it "空行を無視して処理できること" do
      entry = create(:entry)

      upload = described_class.new(csv_data: <<~CSV)

        #{entry.id},5

      CSV

      expect(upload.save).to be true
      expect(entry.reload.priority).to eq(5)
    end

    it "CP932のCSVも処理できること" do
      entry = create(:entry)
      upload = described_class.new(csv_data: "#{entry.id},8\n".encode("CP932"))

      expect(upload.save).to be true
      expect(entry.reload.priority).to eq(8)
    end
  end
end

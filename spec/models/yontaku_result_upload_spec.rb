require "rails_helper"

RSpec.describe YontakuResultUpload, type: :model do
  let(:valid_csv_data) do
    <<~CSV.encode("CP932")
      番号,氏名,得点,設問1,設問2,設問3
      101,山田太郎,3,1,2,3
      102,山田太郎,2,2,1,3
    CSV
  end

  let(:invalid_csv_data) do
    <<~CSV.encode("CP932")
      番号,氏名,得点,問題1,問題2
      101,山田太郎,3,1,2
    CSV
  end

  describe "バリデーション" do
    it "CSVデータが必須であること" do
      upload = described_class.new
      expect(upload).not_to be_valid
      expect(upload.errors[:csv_data]).to include("を入力してください")
    end

    it "正しい形式のCSVデータは有効であること" do
      create(:player, id: 10)
      upload = described_class.new(csv_data: valid_csv_data)
      expect(upload).to be_valid
    end

    it "不正な形式のCSVデータは無効であること" do
      upload = described_class.new(csv_data: invalid_csv_data)
      expect(upload).not_to be_valid
      expect(upload.errors[:base]).to include("CSVの形式が正しくありません。")
    end
  end

  describe "#process" do
    let!(:player) { create(:player, id: 10) }

    it "正しいCSVデータを処理できること" do
      upload = described_class.new(csv_data: valid_csv_data)
      expect { upload.process }.to change { YontakuPlayerPaper.count }.by(2)
      expect(upload.imported_lines_count).to eq(2)
      expect(upload.error_lines).to be_empty
    end

    it "存在しないプレイヤーのデータはエラーとして記録されること" do
      csv_with_invalid_player = <<~CSV.encode("CP932")
        番号,氏名,得点,設問1,設問2,設問3
        999,存在しないプレイヤー,3,1,2,3
      CSV
      upload = described_class.new(csv_data: csv_with_invalid_player)
      expect { upload.process }.not_to(change { YontakuPlayerPaper.count })
      expect(upload.imported_lines_count).to eq(0)
      expect(upload.error_lines.size).to eq(1)
    end

    it "設問数が合わないデータはエラーとして記録されること" do
      csv_with_invalid_answers = <<~CSV.encode("CP932")
        番号,氏名,得点,設問1,設問2,設問3
        101,山田太郎,3,1,2
      CSV
      upload = described_class.new(csv_data: csv_with_invalid_answers)
      expect { upload.process }.not_to(change { YontakuPlayerPaper.count })
      expect(upload.imported_lines_count).to eq(0)
      expect(upload.error_lines.size).to eq(1)
    end
  end
end

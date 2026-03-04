require "rails_helper"

RSpec.describe Question, type: :model do
  describe "#split_text_at" do
    let(:char_timestamps) do
      [
        { "char" => "テ", "start" => 0.0, "end" => 0.2 },
        { "char" => "ス", "start" => 0.2, "end" => 0.4 },
        { "char" => "ト", "start" => 0.4, "end" => 0.6 },
        { "char" => "問", "start" => 0.6, "end" => 0.8 },
        { "char" => "題", "start" => 0.8, "end" => 1.0 },
      ]
    end
    let(:question) { build(:question, text: "テスト問題", char_timestamps:) }

    context "read_duration が nil のとき" do
      it "read_text が空で unread_text が全文になる" do
        result = question.split_text_at(nil)
        expect(result[:read_text]).to eq ""
        expect(result[:unread_text]).to eq "テスト問題"
      end
    end

    context "read_duration が 0 のとき" do
      it "read_text が空で unread_text が全文になる" do
        result = question.split_text_at(0)
        expect(result[:read_text]).to eq ""
        expect(result[:unread_text]).to eq "テスト問題"
      end
    end

    context "read_duration が正の値のとき" do
      it "end <= read_duration の文字が read_text になる" do
        result = question.split_text_at(0.5)
        expect(result[:read_text]).to eq "テス"
        expect(result[:unread_text]).to eq "ト問題"
      end

      it "全文が end <= read_duration に収まるとき read_text が全文になる" do
        result = question.split_text_at(1.0)
        expect(result[:read_text]).to eq "テスト問題"
        expect(result[:unread_text]).to eq ""
      end
    end

    context "char_timestamps が nil のとき" do
      let(:question) { build(:question, text: "テスト問題", char_timestamps: nil) }

      it "read_duration が正の値でも全文が unread_text になる（全て読まれなかったとして扱う）" do
        result = question.split_text_at(1.0)
        expect(result[:read_text]).to eq ""
        expect(result[:unread_text]).to eq "テスト問題"
      end
    end

    context "char_timestamps が空配列のとき" do
      let(:question) { build(:question, text: "テスト問題", char_timestamps: []) }

      it "read_duration が正の値でも全文が unread_text になる" do
        result = question.split_text_at(1.0)
        expect(result[:read_text]).to eq ""
        expect(result[:unread_text]).to eq "テスト問題"
      end
    end
  end
end

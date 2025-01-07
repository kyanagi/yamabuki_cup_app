require "rails_helper"

RSpec.describe QuestionPlayerResult, type: :model do
  describe "association" do
    let(:player) { create(:player) }
    let(:question) { create(:question) }
    let(:question_allocation) { create(:question_allocation, question:) }
    let(:question_result) { create(:question_result, question_allocation:) }
    let(:question_player_result) { create(:question_player_result, question_result:, player:) }

    it "関連レコードが取得できること" do
      expect(question_player_result.player).to eq player
      expect(question_player_result.question_result).to eq question_result
    end
  end

  describe "enum" do
    let(:question_player_result) { build(:question_player_result, result: "correct", situation: "pushed") }

    it "resultが正誤を表すこと" do
      expect(question_player_result.result).to eq "correct"
      expect(question_player_result.correct?).to be true
    end

    it "situationが解答権を得た状況を表すこと" do
      expect(question_player_result.situation).to eq "pushed"
      expect(question_player_result.pushed?).to be true
    end
  end
end

require "rails_helper"

RSpec.describe QuestionResult, type: :model do
  describe "#question" do
    let(:question) { create(:question) }
    let(:question_allocation) { create(:question_allocation, question:) }
    let(:question_result) { create(:question_result, question_allocation:) }

    it "questionが取得できること" do
      expect(question_result.question_allocation).to eq question_allocation
      expect(question_result.question).to eq question
    end
  end
end

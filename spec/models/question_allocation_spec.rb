require "rails_helper"

RSpec.describe QuestionAllocation, type: :model do
  describe "associations" do
    let(:question_allocation) { create(:question_allocation) }
    let(:question_result) { create(:question_result, question_allocation:) }
    let!(:question_player_result) { create(:question_player_result, question_result:) }

    it do
      expect(question_allocation.match).to be_a(Match)
      expect(question_allocation.question).to be_a(Question)
      expect(question_allocation.question_result).to eq question_result
      expect(question_allocation.question_player_results).to contain_exactly(question_player_result)
    end
  end
end

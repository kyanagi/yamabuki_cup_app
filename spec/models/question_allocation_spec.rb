require "rails_helper"

RSpec.describe QuestionAllocation, type: :model do
  describe "associations" do
    let(:question_allocation) { create(:question_allocation) }

    it do
      expect(question_allocation.match).to be_a(Match)
      expect(question_allocation.question).to be_a(Question)
    end
  end
end

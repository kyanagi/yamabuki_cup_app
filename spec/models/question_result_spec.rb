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

  describe "#match" do
    let(:match) { create(:match) }
    let(:question_allocation) { create(:question_allocation, match:) }
    let(:question_result) { create(:question_result, question_allocation:) }

    it "matchが取得できること" do
      expect(question_result.match).to eq match
    end
  end

  describe "#destroy" do
    let(:question) { create(:question) }
    let(:match) { create(:match) }
    let(:question_allocation) { create(:question_allocation, question: question, match: match) }
    let!(:question_result) { create(:question_result, question_allocation: question_allocation) }

    before do
      create_list(:question_player_result, 2, question_result:)
    end

    it "関連するquestion_player_resultsも削除されること" do
      expect { question_result.destroy }.to change { QuestionPlayerResult.count }.by(-2)
    end

    it "question_allocation, question, matchは削除されないこと" do
      question_result.destroy
      expect(QuestionAllocation.exists?(question_allocation.id)).to be true
      expect(Question.exists?(question.id)).to be true
      expect(Match.exists?(match.id)).to be true
    end
  end
end

require "rails_helper"

RSpec.describe QuestionProvider, type: :model do
  describe "#next_questions" do
    let!(:questions) { create_list(:question, 5) }

    it "次の2つの問題を返すこと" do
      create(:question_provider, next_question: questions[0])
      expect(QuestionProvider.next_questions).to eq([questions[0], questions[1]])
    end

    it "次の問題が末尾のときは、その次は先頭の問題に戻ること" do
      create(:question_provider, next_question: questions[4])
      expect(QuestionProvider.next_questions).to eq([questions[4], questions[0]])
    end
  end
end

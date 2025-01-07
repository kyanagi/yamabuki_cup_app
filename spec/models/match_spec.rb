require "rails_helper"

RSpec.describe Match, type: :model do
  describe "#round" do
    it "関連するRoundが取得できること" do
      match = Match.find(21)
      expect(match.round).to eq(Round.find(2))
    end
  end

  describe "#asked_questions" do
    let(:match) { Match.find(21) }
    let(:questions) { create_list(:question, 3) }

    before do
      create(:question_allocation, match: match, question: questions[1], order: 1)
      create(:question_allocation, match: match, question: questions[0], order: 2)
    end

    it "出題された問題が出題順に取得できること" do
      expect(match.asked_questions).to eq([questions[1], questions[0]])
    end
  end
end

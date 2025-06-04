require "rails_helper"

RSpec.describe Match, type: :model do
  describe "#round" do
    let(:match) { create(:match, round_id: Round::ROUND2.id) }

    it "関連するRoundが取得できること" do
      expect(match.round).to eq(Round::ROUND2)
    end
  end

  describe "#asked_questions" do
    let(:match) { create(:match) }
    let(:questions) { create_list(:question, 3) }

    before do
      another_match = create(:match)
      create(:question_allocation, match: match, question: questions[1], order: 1)
      create(:question_allocation, match: match, question: questions[0], order: 2)
      create(:question_allocation, match: another_match, question: questions[2], order: 1)
    end

    it "出題された問題が出題順に取得できること" do
      expect(match.asked_questions).to eq([questions[1], questions[0]])
    end
  end

  describe "#full_name" do
    let(:match) { create(:match, round_id: Round::ROUND2.id, name: "第1組") }

    it "full_name が取得できること" do
      expect(match.full_name).to eq("2R 第1組")
    end
  end
end

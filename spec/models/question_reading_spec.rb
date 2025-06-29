require "rails_helper"

RSpec.describe QuestionReading, type: :model do
  include ActiveSupport::Testing::TimeHelpers
  describe ".oldest_without_allocation" do
    context "QuestionAllocationがない場合" do
      it "created_atが最も古いQuestionReadingが返される" do
        question1 = create(:question)
        question2 = create(:question)

        # 古い順に作成（created_atが異なるように）
        old_reading = nil
        travel_to 2.hours.ago do
          old_reading = create(:question_reading, question: question1)
        end

        travel_to 1.hour.ago do
          create(:question_reading, question: question2)
        end

        expect(QuestionReading.oldest_without_allocation).to eq old_reading
      end
    end

    context "一部のQuestionReadingがQuestionAllocationと結びついている場合" do
      it "QuestionAllocationと結びついていないもののうち、最も古いものが返される" do
        question1 = create(:question)
        question2 = create(:question)
        question3 = create(:question)
        match = create(:match)

        # 古い順に作成
        oldest_reading = nil
        travel_to 3.hours.ago do
          oldest_reading = create(:question_reading, question: question1)
        end

        travel_to 2.hours.ago do
          create(:question_reading, question: question2)
          create(:question_allocation, question: question2, match: match)
        end

        travel_to 1.hour.ago do
          create(:question_reading, question: question3)
        end

        expect(QuestionReading.oldest_without_allocation).to eq oldest_reading
      end
    end

    context "すべてのQuestionReadingがQuestionAllocationと結びついている場合" do
      it "nilが返される" do
        question1 = create(:question)
        question2 = create(:question)
        match = create(:match)

        create(:question_reading, question: question1)
        create(:question_reading, question: question2)
        create(:question_allocation, question: question1, match: match)
        create(:question_allocation, question: question2, match: match)

        expect(QuestionReading.oldest_without_allocation).to be_nil
      end
    end

    context "QuestionReadingが存在しない場合" do
      it "nilが返される" do
        expect(QuestionReading.oldest_without_allocation).to be_nil
      end
    end

    context "同じquestion_idを持つQuestionReadingが複数ある場合" do
      it "同じquestionに対する複数のQuestionReadingのうち、created_atが最も古いものが返される" do
        question = create(:question)

        # 同じquestionに対して複数のQuestionReadingを作成
        oldest_reading = nil
        travel_to 3.hours.ago do
          oldest_reading = create(:question_reading, question: question)
        end

        travel_to 2.hours.ago do
          create(:question_reading, question: question)
        end

        travel_to 1.hour.ago do
          create(:question_reading, question: question)
        end

        expect(QuestionReading.oldest_without_allocation).to eq oldest_reading
      end

      it "QuestionAllocationがそのquestion_idと結びついている場合は、すべてのQuestionReadingが除外される" do
        question1 = create(:question)
        question2 = create(:question)
        match = create(:match)

        # question1に対して複数のQuestionReadingを作成
        travel_to 3.hours.ago do
          create(:question_reading, question: question1)
        end

        travel_to 2.hours.ago do
          create(:question_reading, question: question1)
        end

        # question1にQuestionAllocationを作成（すべてのquestion1のQuestionReadingが除外される）
        create(:question_allocation, question: question1, match: match)

        # question2に対してQuestionReadingを作成（これが返されるべき）
        expected_reading = nil
        travel_to 1.hour.ago do
          expected_reading = create(:question_reading, question: question2)
        end

        expect(QuestionReading.oldest_without_allocation).to eq expected_reading
      end
    end
  end
end

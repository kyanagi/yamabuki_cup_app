class QuestionReading < ApplicationRecord
  belongs_to :question

  # QuestionAllocationと結びつけられていないQuestionReadingのうち、
  # created_atが最も古いものを取得
  def self.oldest_without_allocation #: QuestionReading?
    joins(:question)
      .where.not(question_id: QuestionAllocation.select(:question_id))
      .order(:created_at)
      .first
  end
end

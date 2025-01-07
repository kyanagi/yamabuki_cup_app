class QuestionResult < ApplicationRecord
  belongs_to :question_allocation
  has_one :question, through: :question_allocation
end

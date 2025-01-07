class QuestionAllocation < ApplicationRecord
  extend ActiveHash::Associations::ActiveRecordExtensions

  belongs_to :question
  belongs_to :match
  has_one :question_result, dependent: :destroy
end

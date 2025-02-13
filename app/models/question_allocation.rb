class QuestionAllocation < ApplicationRecord
  extend ActiveHash::Associations::ActiveRecordExtensions

  belongs_to :question, optional: true
  belongs_to :match
  has_one :question_result, dependent: :destroy
  has_many :question_player_results, through: :question_result
end

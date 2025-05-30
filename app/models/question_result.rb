class QuestionResult < ApplicationRecord
  belongs_to :question_allocation
  has_one :question, through: :question_allocation
  has_many :question_player_results, dependent: :destroy
  has_one :match, through: :question_allocation
end

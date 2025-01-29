class Question < ApplicationRecord
  has_one :question_allocation, dependent: :destroy
  has_one :match, through: :question_allocation
end

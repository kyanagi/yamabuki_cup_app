class QuestionAllocation < ApplicationRecord
  extend ActiveHash::Associations::ActiveRecordExtensions

  belongs_to :question
  belongs_to :match
end

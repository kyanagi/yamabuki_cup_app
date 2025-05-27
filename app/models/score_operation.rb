class ScoreOperation < ApplicationRecord
  belongs_to :match
  belongs_to :question_result, optional: true
  belongs_to :previous_score_operation, class_name: "ScoreOperation", optional: true
end

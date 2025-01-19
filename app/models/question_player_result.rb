class QuestionPlayerResult < ApplicationRecord
  enum :result, { correct: 0, wrong: 1 }
  enum :situation, { pushed: 0, unpushed: 1 }

  belongs_to :player
  belongs_to :question_result
end

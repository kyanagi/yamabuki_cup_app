class QuestionPlayerResult < ApplicationRecord
  enum :result, { correct: 0, wrong: 1 }, prefix: true
  enum :situation, { pushed: 0, unpushed: 1 }, prefix: true

  belongs_to :player
  belongs_to :question_result

  # @rbs correct: String
  # @rbs ?wrong: String
  # @rbs ?return: String
  def to_s(correct: "◯", wrong: "×")
    name = player.player_profile.family_name
    ox = result_correct? ? correct : wrong
    "#{name}#{ox}"
  end
end

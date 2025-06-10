class Round3CoursePreference < ApplicationRecord
  belongs_to :player
  belongs_to :choice1_match, class_name: "Match"
  belongs_to :choice2_match, class_name: "Match"
  belongs_to :choice3_match, class_name: "Match"
  belongs_to :choice4_match, class_name: "Match"

  validate :validate_unique_choices

  # @rbs return Array[Match]
  def choices
    [choice1_match, choice2_match, choice3_match, choice4_match]
  end

  private

  def validate_unique_choices #: void
    choice_ids = [choice1_match_id, choice2_match_id, choice3_match_id, choice4_match_id].compact
    if choice_ids.uniq.length != choice_ids.length
      errors.add(:base, "選択したコースに重複があります")
    end
  end
end

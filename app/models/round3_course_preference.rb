class Round3CoursePreference < ApplicationRecord
  belongs_to :player
  belongs_to :choice1_match, class_name: "Match"
  belongs_to :choice2_match, class_name: "Match"
  belongs_to :choice3_match, class_name: "Match"
  belongs_to :choice4_match, class_name: "Match"

  def choices
    [choice1_match, choice2_match, choice3_match, choice4_match]
  end
end

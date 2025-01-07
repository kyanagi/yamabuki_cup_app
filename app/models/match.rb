# rubocop:disable Rails/HasManyOrHasOneDependent
class Match < ActiveHash::Base
  include ActiveHash::Associations

  belongs_to :round
  has_many :matchings
  has_many :question_allocations
  # has_many :asked_questions, through: :question_allocations, source: :question

  self.data = [
    { id: 21, name: "2R Group 1", round_id: 2, rule_name: "RoundRule::Round2" },
    { id: 22, name: "2R Group 2", round_id: 2, rule_name: "RoundRule::Round2" },
    { id: 23, name: "2R Group 3", round_id: 2, rule_name: "RoundRule::Round2" },
    { id: 24, name: "2R Group 4", round_id: 2, rule_name: "RoundRule::Round2" },
    { id: 25, name: "2R Group 5", round_id: 2, rule_name: "RoundRule::Round2" },
    { id: 31, name: "3R Course A", round_id: 3, rule_name: "RoundRule::Round3Hayaoshi73" },
    { id: 32, name: "3R Course B", round_id: 4, rule_name: "RoundRule::Round3Hayaoshi71" },
  ]

  def rule
    @rule ||= rule_name.constantize.new(match: self)
  end
end

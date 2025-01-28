class Match < ApplicationRecord
  extend ActiveHash::Associations::ActiveRecordExtensions

  belongs_to :round
  has_many :matchings, dependent: :destroy
  has_many :question_allocations, dependent: :destroy
  has_many :asked_questions, -> { order('"question_allocations"."order"') }, through: :question_allocations, source: :question

  # @rbs @rule: MatchRule::Base

  # @rbs return: MatchRule::Base
  def rule
    @rule ||= rule_name.constantize.new(self)
  end
end

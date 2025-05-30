class Match < ApplicationRecord
  extend ActiveHash::Associations::ActiveRecordExtensions

  belongs_to :round
  has_many :matchings, dependent: :destroy
  has_many :question_allocations, dependent: :destroy
  has_many :asked_questions, -> { order('"question_allocations"."order"') }, through: :question_allocations, source: :question
  has_many :score_operations, dependent: :destroy
  belongs_to :last_score_operation, class_name: "ScoreOperation", optional: true

  # @rbs @rule: MatchRule::Base

  # @rbs return: MatchRule::Base
  def rule
    @rule ||= rule_class.new(self)
  end

  def rule_class
    rule_name.constantize
  end

  # 現在の試合状況の概要を返す
  # @rbs return: String
  def progress_summary
    rule.progress_summary
  end

  # @rbs return: Score::ActiveRecord_Associations_CollectionProxy
  def current_scores
    last_score_operation&.scores || Score.none
  end
end

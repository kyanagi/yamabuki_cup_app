class QuestionProvider < ApplicationRecord
  belongs_to :next_question, optional: true, class_name: "Question"

  # @rbs return: Question
  def self.next_question
    first!.next_question
  end

  # @rbs return: Array[Question]
  def self.next_questions
    nex = next_question
    next2 = Question.where("id > ?", nex.id).order(:id).first
    next2 ||= Question.order(:id).first
    [nex, next2]
  end
end

class QuestionProvider < ApplicationRecord
  belongs_to :next_question, optional: true, class_name: "Question"

  # @rbs return: Question
  def self.next_question
    first!.next_question
  end

  # @rbs return: Array[Question]
  def next_questions
    nex = next_question
    next2 = Question.where("id > ?", nex.id).order(:id).first
    next2 ||= Question.order(:id).first
    [nex, next2]
  end

  # @rbs return: Array[Question]
  def self.next_questions
    first!.next_questions
  end

  # @rbs return: void
  def proceed_to_next_question!
    next_qid = next_question_id + 1
    max_question_id = Question.maximum(:id)
    if next_qid > max_question_id
      self.next_question = Question.order(:id).first
    else
      self.next_question = Question.find(next_qid)
    end
    update!(next_question:)
  end
end

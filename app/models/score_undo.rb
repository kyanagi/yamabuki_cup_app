class ScoreUndo < ActiveType::Object
  attribute :match_id

  belongs_to :match

  before_save :undo_operation

  private

  def undo_operation #: void
    undoing_operation = match.last_score_operation

    return if undoing_operation.nil?

    match.update!(last_score_operation: undoing_operation.previous_score_operation)

    question_allocation = undoing_operation.question_result&.question_allocation

    undoing_operation.destroy!
    question_allocation&.destroy!
  end
end

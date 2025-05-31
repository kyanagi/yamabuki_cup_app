class ScoreUndo < ActiveType::Object
  attribute :match_id

  belongs_to :match

  before_save :undo_operation

  def undo_operation
    previous_score_operation = match.last_score_operation&.previous_score_operation
    if previous_score_operation
      match.update!(last_score_operation: previous_score_operation)
    end
  end
end

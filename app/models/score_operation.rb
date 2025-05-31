class ScoreOperation < ApplicationRecord
  belongs_to :match
  belongs_to :question_result, optional: true
  has_many :scores, dependent: :destroy

  # 自身を含め、それまでに実行された ScoreOperation の履歴を返す。
  # 戻り値の ScoreOperation は新しい順に並んでいる。
  # @rbs return: Array[ScoreOperation]
  def operation_history
    score_operation_ids = path.split(",").compact_blank.reverse
    ScoreOperation.find(score_operation_ids).prepend(self)
  end

  private

  def set_path #: void
    last_score_operation = match.last_score_operation
    if last_score_operation
      self.path = "#{last_score_operation.path},#{last_score_operation.id}"
    else
      self.path = ""
    end
  end
end

# 新しいセットに移行するクラス。
class SetTransition < ScoreOperation
  before_create :update_scores
  before_create :set_path
  after_create :update_match_last_score_operation

  private

  def update_scores #: void
    match.rule.start_new_set(self)
  end

  def update_match_last_score_operation #: void
    match.update!(last_score_operation: self)
  end
end

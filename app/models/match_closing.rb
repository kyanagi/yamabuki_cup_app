# 問題限定終了の処理を行うクラス。
# 問題限定終了時の判定を行う。
class MatchClosing < ScoreOperation
  before_create :update_scores
  before_create :set_path
  after_create :update_match_last_score_operation

  private

  def update_scores #: void
    match.rule.process_match_closing(self)
  end

  def update_match_last_score_operation #: void
    match.update!(last_score_operation: self)
  end
end

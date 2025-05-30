# 問題限定終了の処理を行うクラス。
# 問題限定終了時の判定を行う。
class MatchClosing < ScoreOperation
  before_create :update_scores

  private

  def update_scores #: void
    match.rule.process_match_closing(self)
  end
end

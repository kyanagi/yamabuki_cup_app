# 試合開始の操作に対応するクラス。
# 各選手の初期スコアを登録する。
class MatchOpening < ScoreOperation
  after_create :create_scores
  after_create :update_match_last_score_operation

  private

  def create_scores #: void
    data = match.matchings.map do |matching|
      {
        matching_id: matching.id,
        score_operation_id: id,
        **match.rule.initial_score_attributes_of(matching.seat),
        created_at: Time.current,
        updated_at: Time.current,
      }
    end
    Score.insert_all!(data)
  end

  def update_match_last_score_operation #: void
    match.update!(last_score_operation: self)
  end
end

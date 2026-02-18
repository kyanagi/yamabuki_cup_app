# 2R裏の勝抜け者確定処理を行うクラス。
# 試合参加者全員のスコアを一括で登録する。
# 勝抜け者: status=win, rank=1..4, points=0, misses=0
# 非勝抜け者: status=lose, rank=nil, points=0, misses=0
class Round2UraQualifierUpdate < ScoreOperation
  attribute :rank_by_matching_id, default: -> { {} }

  before_create :set_path
  after_create :create_scores
  after_create :update_match_last_score_operation

  private

  def create_scores #: void
    data = match.matchings.map do |matching|
      rank_str = rank_by_matching_id[matching.id.to_s]
      if rank_str.present?
        {
          matching_id: matching.id,
          score_operation_id: id,
          status: "win",
          rank: rank_str.to_i,
          points: 0,
          misses: 0,
          stars: 0,
          created_at: Time.current,
          updated_at: Time.current,
        }
      else
        {
          matching_id: matching.id,
          score_operation_id: id,
          status: "lose",
          rank: nil,
          points: 0,
          misses: 0,
          stars: 0,
          created_at: Time.current,
          updated_at: Time.current,
        }
      end
    end
    Score.insert_all!(data)
  end

  def update_match_last_score_operation #: void
    match.update!(last_score_operation: self)
  end
end

# 2R表の得点状況自由編集を記録する操作クラス。
# 参加者全員分のスコアスナップショットを保存する。
class ScoreFreeEditOperation < ScoreOperation
  attribute :score_attributes_by_matching_id, default: -> { {} }

  before_create :set_path
  after_create :create_scores
  after_create :update_match_last_score_operation

  private

  def create_scores #: void
    now = Time.current
    data = match.matchings.map do |matching|
      score_attributes = score_attributes_by_matching_id.fetch(matching.id.to_s, {})

      {
        matching_id: matching.id,
        score_operation_id: id,
        status: score_attributes[:status] || score_attributes["status"],
        points: score_attributes[:points] || score_attributes["points"] || 0,
        misses: score_attributes[:misses] || score_attributes["misses"] || 0,
        rank: score_attributes[:rank] || score_attributes["rank"],
        stars: score_attributes[:stars] || score_attributes["stars"] || 0,
        created_at: now,
        updated_at: now,
      }
    end

    Score.insert_all!(data)
  end

  def update_match_last_score_operation #: void
    match.update!(last_score_operation: self)
  end
end

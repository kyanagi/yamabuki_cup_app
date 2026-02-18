# 2R裏の勝抜け者入力フォームオブジェクト。
# バリデーションを担当し、保存時に Round2UraQualifierUpdate を作成する。
class Round2UraQualifierInput < ActiveType::Object
  attribute :match_id, :integer
  attribute :rank_by_matching_id, default: -> { {} }

  belongs_to :match

  validate :match_must_be_round2_ura
  validate :winners_count_must_be_exactly_four
  validate :ranks_must_be_one_through_four_without_duplicates
  validate :all_matchings_must_belong_to_match

  before_save :save_qualifier_update

  private

  def match_must_be_round2_ura #: void
    return unless match

    unless match.rule_class == MatchRule::Round2Ura
      errors.add(:match, "は2R裏の試合でなければなりません")
    end
  end

  def winners_count_must_be_exactly_four #: void
    winner_count = rank_by_matching_id.count { |_, v| v.present? }
    unless winner_count == 4
      errors.add(:base, "勝抜け者はちょうど4名である必要があります（現在: #{winner_count}名）")
    end
  end

  def ranks_must_be_one_through_four_without_duplicates #: void
    ranks = rank_by_matching_id.values.compact_blank.map(&:to_i).sort
    unless ranks == [1, 2, 3, 4]
      errors.add(:base, "順位は1, 2, 3, 4をそれぞれ1回ずつ使用する必要があります")
    end
  end

  def all_matchings_must_belong_to_match #: void
    return unless match

    matching_ids = rank_by_matching_id.keys.map(&:to_i)
    unless matching_ids.all? { |mid| match.matchings.exists?(mid) }
      errors.add(:base, "選択された参加者はこの試合の参加者ではありません")
    end
  end

  def save_qualifier_update #: void
    qualifier_update = Round2UraQualifierUpdate.new(match: match, rank_by_matching_id: rank_by_matching_id)
    return if qualifier_update.save

    errors.merge!(qualifier_update.errors)
    throw(:abort)
  end
end

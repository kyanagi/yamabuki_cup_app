# 2R表の得点状況自由編集フォームオブジェクト。
# バリデーションを担当し、保存時に ScoreFreeEditOperation を作成する。
class ScoreFreeEditInput < ActiveType::Object
  RULE_CONFIG = {
    MatchRule::Round2Omote => {
      editable_fields: [:status, :points, :misses, :rank],
      allowed_statuses: %w[playing waiting win lose],
    },
    MatchRule::Round3Hayaoshi71 => {
      editable_fields: [:status, :points, :misses, :rank],
      allowed_statuses: %w[playing waiting win lose],
    },
    MatchRule::Round3Hayaoshi73 => {
      editable_fields: [:status, :points, :misses, :rank],
      allowed_statuses: %w[playing waiting win lose],
    },
    MatchRule::Quarterfinal => {
      editable_fields: [:status, :points, :misses, :rank],
      allowed_statuses: %w[playing waiting win],
    },
    MatchRule::Round3Hayabo => {
      editable_fields: [:status, :points, :rank],
      allowed_statuses: %w[playing waiting win],
    },
    MatchRule::Round3Hayabo2 => {
      editable_fields: [:status, :points, :rank],
      allowed_statuses: %w[playing waiting win],
    },
    MatchRule::Semifinal => {
      editable_fields: [:status, :points, :rank],
      allowed_statuses: %w[playing win lose],
    },
    MatchRule::Playoff => {
      editable_fields: [:status, :points, :rank],
      allowed_statuses: %w[playing win lose],
    },
    MatchRule::Final => {
      editable_fields: [:status, :stars, :points, :misses, :rank],
      allowed_statuses: %w[playing waiting set_win win],
    },
  }.freeze

  attribute :match_id, :integer
  attribute :scores_by_matching_id, default: -> { {} }

  belongs_to :match

  validate :match_must_be_supported
  validate :all_matchings_must_belong_to_match
  validate :statuses_must_be_allowed
  validate :scores_must_be_integer_values

  before_save :save_score_free_edit_operation

  class << self
    def editable_for?(rule_class)
      RULE_CONFIG.key?(rule_class)
    end

    def editable_fields_for(rule_class)
      config_for(rule_class)[:editable_fields]
    end

    def status_options_for(rule_class)
      config_for(rule_class)[:allowed_statuses]
    end

    private

    def config_for(rule_class)
      RULE_CONFIG[rule_class] || { editable_fields: [], allowed_statuses: [] }
    end
  end

  private

  def match_must_be_supported #: void
    return unless match

    return if self.class.editable_for?(match.rule_class)

    errors.add(:match, "は自由編集の対象外です")
  end

  def all_matchings_must_belong_to_match #: void
    return unless match

    input_ids = scores_by_matching_id.keys.map(&:to_i)
    allowed_ids = match.matchings.pluck(:id)
    unless input_ids.all? { |id| allowed_ids.include?(id) }
      errors.add(:base, "選択された参加者はこの試合の参加者ではありません")
    end
  end

  def statuses_must_be_allowed #: void
    return unless match

    editable_fields = self.class.editable_fields_for(match.rule_class)
    return unless editable_fields.include?(:status)

    allowed_statuses = self.class.status_options_for(match.rule_class)
    scores_by_matching_id.each do |matching_id, attrs|
      status = fetch_attr(attrs, :status)
      next if allowed_statuses.include?(status)

      errors.add(:base, "statusが不正です（matching_id: #{matching_id}）")
    end
  end

  def scores_must_be_integer_values #: void
    return unless match

    editable_fields = self.class.editable_fields_for(match.rule_class)
    scores_by_matching_id.each do |matching_id, attrs|
      validate_integer_field(attrs, :points, allow_blank: false, matching_id: matching_id) if editable_fields.include?(:points)
      validate_integer_field(attrs, :misses, allow_blank: false, matching_id: matching_id) if editable_fields.include?(:misses)
      validate_integer_field(attrs, :stars, allow_blank: false, matching_id: matching_id) if editable_fields.include?(:stars)
      validate_integer_field(attrs, :rank, allow_blank: true, matching_id: matching_id) if editable_fields.include?(:rank)
    end
  end

  def validate_integer_field(attrs, key, allow_blank:, matching_id:) #: void
    value = fetch_attr(attrs, key)
    if value.blank?
      unless allow_blank
        errors.add(:base, "#{key}は整数で入力してください（matching_id: #{matching_id}）")
      end
      return
    end

    return if value.is_a?(Integer)
    return if value.to_s.match?(/\A-?\d+\z/)

    errors.add(:base, "#{key}は整数で入力してください（matching_id: #{matching_id}）")
  end

  def save_score_free_edit_operation #: void
    operation = ScoreFreeEditOperation.new(
      match: match,
      score_attributes_by_matching_id: normalized_score_attributes_by_matching_id
    )

    return if operation.save

    errors.merge!(operation.errors)
    throw(:abort)
  end

  def normalized_score_attributes_by_matching_id
    editable_fields = self.class.editable_fields_for(match.rule_class)
    current_scores = match.current_scores.index_by { |score| score.matching_id.to_s }

    match.matchings.each_with_object({}) do |matching, hash|
      attrs = scores_by_matching_id.fetch(matching.id.to_s, {})
      current_score = current_scores[matching.id.to_s]
      initial = match.rule.initial_score_attributes_of(matching.seat)

      hash[matching.id.to_s] = {
        status: normalize_status(attrs, editable_fields, current_score, initial),
        points: normalize_points(attrs, editable_fields, current_score, initial),
        misses: normalize_misses(attrs, editable_fields, current_score, initial),
        rank: normalize_rank_value(attrs, editable_fields, current_score),
        stars: normalize_stars(attrs, editable_fields, current_score),
      }
    end
  end

  def normalize_status(attrs, editable_fields, current_score, initial)
    value = editable_fields.include?(:status) ? fetch_attr(attrs, :status) : nil
    value || current_score&.status || initial[:status]
  end

  def normalize_points(attrs, editable_fields, current_score, initial)
    value = editable_fields.include?(:points) ? fetch_attr(attrs, :points) : nil
    normalize_integer(value, current_score&.points || initial[:points])
  end

  def normalize_misses(attrs, editable_fields, current_score, initial)
    value = editable_fields.include?(:misses) ? fetch_attr(attrs, :misses) : nil
    normalize_integer(value, current_score&.misses || initial[:misses])
  end

  def normalize_rank_value(attrs, editable_fields, current_score)
    value = editable_fields.include?(:rank) ? fetch_attr(attrs, :rank) : nil
    normalize_rank(value, current_score&.rank)
  end

  def normalize_stars(attrs, editable_fields, current_score)
    value = editable_fields.include?(:stars) ? fetch_attr(attrs, :stars) : nil
    normalize_integer(value, current_score&.stars || 0)
  end

  def fetch_attr(attrs, key)
    attrs[key.to_s] || attrs[key.to_sym]
  end

  def normalize_integer(value, default)
    return default if value.nil? || value == ""

    value.to_i
  end

  def normalize_rank(value, default)
    return default if value.nil?
    return nil if value == ""

    value.to_i
  end
end

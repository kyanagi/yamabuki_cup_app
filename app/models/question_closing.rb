# 問題1問ごとの締めの処理を行うクラス。
# 問題の正誤を記録し、勝ち抜けや失格の処理を行う。
class QuestionClosing < ActiveType::Object
  attribute :question_id, :integer
  attribute :question_player_results_attributes

  belongs_to :question

  before_validation :transfer_attributes
  before_save :save_records
  before_save :update_scores

  validates :question, presence: true # rubocop:disable Rails/RedundantPresenceValidationOnBelongsTo
  validate :validate_question_player_results_attributes

  private

  def validate_question_player_results_attributes #: void
    return errors.add(:question_player_results_attributes, "must be an array") unless question_player_results_attributes.is_a?(Array)

    question_player_results_attributes.each do |attr|
      unless attr[:player_id].is_a?(Integer)
        errors.add(:question_player_results_attributes, "player_id must be an integer")
      end

      unless Player.exists?(attr[:player_id])
        errors.add(:question_player_results_attributes, "player_id must be an existing player_id")
      end

      unless QuestionPlayerResult.results.keys.include?(attr[:result])
        errors.add(:question_player_results_attributes, "result must be one of #{QuestionPlayerResult.results.keys.join(', ')}")
      end

      unless QuestionPlayerResult.situations.keys.include?(attr[:situation])
        errors.add(:question_player_results_attributes, "situation must be one of #{QuestionPlayerResult.situations.keys.join(', ')}")
      end
    end
  end

  def transfer_attributes #: void
    question_allocation = QuestionAllocation.find_by(question_id:)
    @question_result = QuestionResult.new(question_allocation:)
    @question_player_results = question_player_results_attributes.map do |attr|
      QuestionPlayerResult.new(attr)
    end
  end

  def save_records #: void
    @question_result.save!
    @question_player_results.each do |r|
      r.question_result = @question_result
      r.save!
    end
  rescue
    errors.add(:base, "Failed to save records")
    throw(:abort)
  end

  def update_scores #: void
    rule = @question_result.match.rule
    rule.process(@question_player_results)
  end
end

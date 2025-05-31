# 問題1問ごとの締めの処理を行うクラス。
# 問題の正誤を記録し、勝ち抜けや失格の処理を行う。
class QuestionClosing < ScoreOperation
  attribute :question_player_results_attributes

  before_validation :transfer_attributes
  before_create :save_records
  before_create :update_scores
  before_create :set_path
  after_create :update_match_last_score_operation

  validate :validate_question_player_results_attributes

  private

  def validate_question_player_results_attributes #: void
    return errors.add(:question_player_results_attributes, "must be an array") unless question_player_results_attributes.is_a?(Array)

    question_player_results_attributes.each do |attr|
      unless attr[:player_id].is_a?(Integer) || /\A\d+\z/ =~ attr[:player_id]
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

  def last_question_reading #: QuestionReading?
    last_question_reading = QuestionReading.order(:created_at).last

    if last_question_reading && QuestionAllocation.exists?(question_id: last_question_reading.question_id)
      return nil
    end

    last_question_reading
  end

  def transfer_attributes #: void
    question_order = (QuestionAllocation.maximum(:order) || 0) + 1

    @question_result = QuestionResult.new
    @question_result.question_allocation = QuestionAllocation.new(
      match:,
      question_id: last_question_reading&.question_id,
      order: question_order
    )
    question_player_results_attributes.map do |attr|
      @question_result.question_player_results.build(attr)
    end
  end

  def save_records #: void
    @question_result.save!
    self.question_result_id = @question_result.id
  rescue
    errors.add(:base, "Failed to save records")
    throw(:abort)
  end

  def update_scores #: void
    match.rule.process_question_closing(self, @question_result.question_player_results)
  end

  def update_match_last_score_operation #: void
    match.update!(last_score_operation: self)
  end
end

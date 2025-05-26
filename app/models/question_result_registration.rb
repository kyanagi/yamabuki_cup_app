class QuestionResultRegistration < ActiveType::Object
  attribute :match_id, :integer
  attribute :player_results

  belongs_to :match

  before_save :set_default_player_results
  before_save :register_question_result_and_process

  def set_default_player_results #: void
    self.player_results ||= []
  end

  def register_question_result_and_process #: void
    last_question_reading = QuestionReading.order(:created_at).last

    if last_question_reading && QuestionAllocation.exists?(question_id: last_question_reading.question_id)
      last_question_reading = nil
    end

    question_order = (QuestionAllocation.maximum(:order) || 0) + 1
    question_allocation = QuestionAllocation.create!(
      match:,
      question_id: last_question_reading&.question_id,
      order: question_order
    )

    question_result = QuestionResult.new(question_allocation:)
    player_results.each do |r|
      matching = match.matchings.find(r[:matching_id])
      situation = r[:situation]
      result = r[:result]
      question_result.question_player_results.build(player_id: matching.player_id, result:, situation:)
    end
    question_result.save!

    match.rule.process(question_result.question_player_results)
  end
end

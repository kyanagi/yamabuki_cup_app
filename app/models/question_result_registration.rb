class QuestionResultRegistration < ActiveType::Object
  attribute :matching_id, :integer
  attribute :result, :string

  belongs_to :matching

  before_save :register_question_result_and_process

  def register_question_result_and_process
    last_question_reading = QuestionReading.order(:created_at).last

    if last_question_reading && QuestionAllocation.exists?(question_id: last_question_reading.question_id)
      last_question_reading = nil
    end

    question_order = (QuestionAllocation.maximum(:order) || 0) + 1
    question_allocation = QuestionAllocation.create!(
      match: matching.match,
      question_id: last_question_reading&.question_id,
      order: question_order
    )

    question_result = QuestionResult.new(question_allocation:)
    question_result.question_player_results.build(
      player_id: matching.player_id,
      result:,
      situation: "pushed"
    )
    question_result.save!

    matching.match.rule.process(question_result.question_player_results)
  end
end

module MatchRule
  class Semifinal < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4

    # @rbs override
    # @rbs score_operation: QuestionClosing
    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_question_closing(score_operation, question_player_results)
      @score_operation = score_operation
      prepare_new_scores(score_operation)

      question_player_results.each do |question_player_result|
        s = @scores.find { |score| score.matching.player_id == question_player_result.player_id }
        next unless s.status_playing?

        if question_player_result.result_correct?
          process_correct(s)
        elsif question_player_result.result_wrong?
          process_wrong(s)
        end
      end
    end

    # @rbs score_operation: ScoreOperation
    # @rbs return: void
    def start_new_set(score_operation)
      prepare_new_scores(score_operation)
      @scores.each do |score|
        score.points = 0
      end
    end

    # @rbs score_operation: ScoreOperation
    # @rbs player_id: Integer
    # @rbs return: void
    def disqualify(score_operation, player_id:)
      prepare_new_scores(score_operation)
      s = @scores.find { |score| score.matching.player_id == player_id }

      mark_as_loser(s)
    end

    private

    # @rbs override
    # @rbs return: void
    def judge_on_quiz_completed
      @scores.select(&:status_playing?).each do |score|
        score.status = "win"
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def process_correct(score)
      score.points += 1
    end

    # @rbs score: Score
    # @rbs return: void
    def process_wrong(score)
      # noop
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_loser(score)
      score.status = "lose"
    end
  end
end

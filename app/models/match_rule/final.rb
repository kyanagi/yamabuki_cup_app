module MatchRule
  class Final < Base
    NUM_SEATS = 4
    NUM_BUTTONS = 4
    NUM_WINNERS = 1
    POINTS_TO_SET_WIN = 3
    MISSES_TO_SET_LOSE = 2
    STARS_TO_WIN = 7

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
    # @rbs question_player_result: QuestionPlayerResult
    # @rbs return: void
    def process_special_question_closing(score_operation, question_player_result)
      @score_operation = score_operation
      prepare_new_scores(score_operation)

      if question_player_result.result_correct?
        s = @scores.find { |score| score.matching.player_id == question_player_result.player_id }
        s.stars += 1
        if s.stars >= STARS_TO_WIN
          s.status = "win"
        end
      end
    end

    # @rbs score_operation: ScoreOperation
    # @rbs return: void
    def start_new_set(score_operation)
      prepare_new_scores(score_operation)
      @scores.each do |s|
        s.attributes = { points: 0, misses: 0, status: "playing" }
      end
    end

    # @rbs seat: Integer
    # @rbs return: Hash[Symbol, untyped]
    def initial_score_attributes_of(seat)
      super.merge(stars: 0)
    end

    private

    # @rbs score: Score
    # @rbs return: void
    def process_correct(score)
      score.points += 1
      if score.points >= self.class::POINTS_TO_SET_WIN
        mark_as_set_winner(score)
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def process_wrong(score)
      score.misses += 1
      if score.misses >= self.class::MISSES_TO_SET_LOSE
        mark_as_set_loser(score)
      end

      # トビ残り
      if only_one_player_is_playing?
        survivor = @scores.find(&:status_playing?)
        mark_as_set_winner(survivor)
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_set_winner(score)
      score.status = "set_win"
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_set_loser(score)
      score.status = "waiting"
    end

    # @rbs return: bool
    def only_one_player_is_playing?
      @scores.one?(&:status_playing?)
    end
  end
end

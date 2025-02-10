module MatchRule
  class Final < Base
    NUM_SEATS = 4
    NUM_BUTTONS = 4
    NUM_WINNERS = 1
    POINTS_TO_SET_WIN = 3
    MISSES_TO_SET_LOSE = 2
    STARS_TO_WIN = 7

    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process(question_player_results)
      question_player_results.each do |question_player_result|
        m = @matchings.find { |matching| matching.player_id == question_player_result.player_id }
        next unless m.status_playing?

        if question_player_result.result_correct?
          process_correct(m)
        elsif question_player_result.result_wrong?
          process_wrong(m)
        end

        m.save!
      end
    end

    # @rbs question_player_result: QuestionPlayerResult
    # @rbs return: void
    def process_special_question(question_player_result)
      if question_player_result.result_correct?
        m = @matchings.find { |matching| matching.player_id == question_player_result.player_id }
        m.stars += 1
        if m.stars >= STARS_TO_WIN
          m.status = "win"
        end
        m.save!
      end
    end

    # @rbs return: void
    def start_new_set
      @matchings.each do |m|
        m.update!(points: 0, misses: 0, status: "playing")
      end
    end

    # @rbs seat: Integer
    # @rbs return: Hash[Symbol, untyped]
    def initial_matching_attributes_of(seat)
      super.merge(stars: 0)
    end

    private

    # @rbs matching: Matching
    # @rbs return: void
    def process_correct(matching)
      matching.points += 1
      if matching.points >= self.class::POINTS_TO_SET_WIN
        mark_as_set_winner(matching)
      end
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_wrong(matching)
      matching.misses += 1
      if matching.misses >= self.class::MISSES_TO_SET_LOSE
        mark_as_set_loser(matching)
      end

      # トビ残り
      if only_one_player_is_playing?
        survivor = @matchings.find(&:status_playing?)
        mark_as_set_winner(survivor)
      end
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_set_winner(matching)
      matching.status = "set_win"
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_set_loser(matching)
      matching.status = "waiting"
    end

    # @rbs return: bool
    def only_one_player_is_playing?
      @matchings.count(&:status_playing?) == 1
    end
  end
end

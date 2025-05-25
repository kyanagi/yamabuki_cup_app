module MatchRule
  class Base
    # @rbs @match: Match

    # @rbs match: Match
    def initialize(match)
      @match = match
      @matchings = match.matchings
    end

    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process(question_player_results)
      raise NotImplementedError
    end

    # @rbs return: void
    def judge_on_quiz_completed
      raise NotImplementedError
    end

    # @rbs seat: Integer
    # @rbs return: Hash[Symbol, untyped]
    def initial_matching_attributes_of(seat)
      { status: initial_status_of(seat), points: initial_points_of(seat), misses: initial_misses_of(seat) }
    end

    # @rbs return: String
    def progress_summary
      num_winners = @matchings.count(&:status_win?)
      num_winners_left = self.class::NUM_WINNERS - num_winners
      "#{self.class::NUM_SEATS}→#{self.class::NUM_WINNERS}／現在#{num_winners}人勝ち抜け、残り#{num_winners_left}人"
    end

    private

    # @rbs (Integer) -> String
    def initial_status_of(_seat)
      "playing"
    end

    # @rbs (Integer) -> Integer
    def initial_points_of(_seat)
      0
    end

    # @rbs (Integer) -> Integer
    def initial_misses_of(_seat)
      0
    end
  end
end

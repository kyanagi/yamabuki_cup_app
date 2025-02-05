module MatchRule
  class Base
    # @rbs @match: Match

    # @rbs match: Match
    def initialize(match)
      @match = match
      @matchings = match.matchings.to_a
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

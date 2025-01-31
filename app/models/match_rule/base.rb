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
  end
end

module MatchRule
  class Base
    # @rbs @match: Match

    # @rbs match: Match
    def initialize(match)
      @match = match
      @matchings = match.matchings.to_a
    end
  end
end

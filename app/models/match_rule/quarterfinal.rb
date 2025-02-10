module MatchRule
  class Quarterfinal < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4
    MISSES_TO_WAIT = 3

    include Hayaoshi

    private

    # @rbs matching: Matching
    # @rbs return: void
    def process_correct(matching)
      matching.points += 1
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_wrong(matching)
      matching.points -= 1
      matching.misses += 1
      if matching.misses >= MISSES_TO_WAIT
        mark_as_waiting(matching)
      end
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_waiting(matching)
      matching.status = "waiting"
    end
  end
end

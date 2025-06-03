module MatchRule
  class Quarterfinal < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4
    MISSES_TO_WAIT = 3
    ADMIN_VIEW_TEMPLATE = "hayaoshi"

    include Hayaoshi

    private

    # @rbs matching: Matching
    # @rbs return: void
    def process_correct(score)
      score.points += 1
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_wrong(score)
      score.points -= 1
      score.misses += 1
      if score.misses >= MISSES_TO_WAIT
        mark_as_waiting(score)
      end
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_waiting(score)
      score.status = "waiting"
    end
  end
end

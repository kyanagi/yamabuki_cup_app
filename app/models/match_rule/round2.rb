module MatchRule
  class Round2 < Base
    NUM_SEATS = 14
    NUM_BUTTONS = 10
    NUM_WINNERS = 5
    POINTS_TO_WIN = 3
    MISSES_TO_LOSE = 2
    NUM_ADVANTAGED_PLAYERS = 3
    ADMIN_VIEW_TEMPLATE = "round2"

    include Hayaoshi

    private

    # @rbs override
    def initial_status_of(seat)
      if seat < self.class::NUM_BUTTONS
        "playing"
      else
        "waiting"
      end
    end

    # @rbs override
    def initial_points_of(seat)
      if seat < self.class::NUM_ADVANTAGED_PLAYERS
        1
      else
        0
      end
    end
  end
end

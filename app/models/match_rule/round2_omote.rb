module MatchRule
  class Round2Omote < Base
    NUM_SEATS = 10
    NUM_BUTTONS = 10
    NUM_WINNERS = 4
    POINTS_TO_WIN = 3
    MISSES_TO_LOSE = 2
    NUM_ADVANTAGED_PLAYERS = 3
    ADMIN_VIEW_TEMPLATE = "round2"

    include Hayaoshi

    private

    # @rbs override
    def initial_points_of(seat)
      seat < self.class::NUM_ADVANTAGED_PLAYERS ? 1 : 0
    end
  end
end

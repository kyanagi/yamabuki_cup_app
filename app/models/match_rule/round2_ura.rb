module MatchRule
  class Round2Ura < Base
    NUM_SEATS = 12
    NUM_BUTTONS = 12
    NUM_WINNERS = 4
    POINTS_TO_WIN = 3
    MISSES_TO_LOSE = 2
    ADMIN_VIEW_TEMPLATE = "round2"

    include Hayaoshi
  end
end

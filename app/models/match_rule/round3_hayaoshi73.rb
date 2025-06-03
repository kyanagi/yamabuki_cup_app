module MatchRule
  class Round3Hayaoshi73 < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4
    POINTS_TO_WIN = 7
    MISSES_TO_LOSE = 3
    ADMIN_VIEW_TEMPLATE = "hayaoshi"

    include Hayaoshi
  end
end

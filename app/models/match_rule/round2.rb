module MatchRule
  class Round2 < Base
    NUM_SEATS = 14
    NUM_BUTTONS = 10
    NUM_WINNERS = 5
    POINTS_TO_WIN = 3
    MISSES_TO_LOSE = 2

    include Hayaoshi
  end
end

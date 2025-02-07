module MatchRule
  class Round3Hayabo < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4
    POINTS_TO_WIN = 12
    POINTS_ON_PUSHED_CORRECT = 3
    POINTS_ON_UNPUSHED_CORRECT = 1
    POINTS_ON_PUSHED_WRONG = -3
    POINTS_ON_UNPUSHED_WRONG = 0
    BONUS_POINTS_ON_SOLE_CORRECT = 1

    include Hayabo
  end
end

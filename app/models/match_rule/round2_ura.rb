module MatchRule
  class Round2Ura < Base
    NUM_SEATS = 12
    NUM_BUTTONS = 12
    NUM_WINNERS = 4
    POINTS_TO_WIN = 3
    MISSES_TO_LOSE = 2
    ADMIN_VIEW_TEMPLATE = "round2"

    include Hayaoshi

    # @rbs override
    # @rbs score_operation: ScoreOperation
    # @rbs return: String
    def summarize_score_operation(score_operation)
      case score_operation
      when Round2UraQualifierUpdate
        winners = score_operation.scores.where(status: "win").order(:rank)
        names = winners.filter_map { |s| s.matching.player.player_profile&.family_name }
        "勝抜け確定: #{names.join(', ')}"
      else
        super
      end
    end
  end
end

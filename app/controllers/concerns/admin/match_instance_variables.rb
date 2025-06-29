# 試合の正誤管理画面で必要なインスタンス変数を設定する。
module Admin
  module MatchInstanceVariables
    extend ActiveSupport::Concern

    private

    def setup_instance_variables(match) #: void
      @match = Match
        .preload(last_score_operation: [
          { question_result: { question_player_results: { player: :player_profile } } },
          :scores,
        ])
        .find(match.id)

      @scores = @match.current_scores
        .eager_load(matching: :player)
        .preload(matching: { player: :player_profile })
        .order("matchings.seat")

      @histories = @match.operation_history.map do |op|
        @match.rule.summarize_score_operation(op)
      end
    end

    def broadcast_scoreboard(match) #: void
      scores = match.current_scores.sort_by { it.matching.seat }
      score_operation = match.last_score_operation
      template = turbo_stream.update("match-scorelist") do
        render_to_string(
          "scoreboard/#{match.rule_class::ADMIN_VIEW_TEMPLATE}/_show",
          layout: false,
          locals: { scores:, score_operation: }
        )
      end
      ActionCable.server.broadcast("scoreboard", template)
    end
  end
end

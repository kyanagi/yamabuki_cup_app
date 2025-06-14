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
  end
end

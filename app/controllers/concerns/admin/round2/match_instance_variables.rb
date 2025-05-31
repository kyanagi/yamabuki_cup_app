# 試合の正誤管理画面で必要なインスタンス変数を設定する。
module Admin
  module Round2
    module MatchInstanceVariables
      extend ActiveSupport::Concern

      private

      def setup_instance_variables(match) #: void
        @scores = match.current_scores
          .eager_load(matching: :player)
          .preload(matching: [{ player: :player_profile }, :match])
          .order("matchings.seat")

        @histories = []
        op = match.last_score_operation
        while op
          @histories << match.rule.summarize_score_operation(op)
          op = op.previous_score_operation
        end
      end
    end
  end
end

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
      end
    end
  end
end

module Admin
  module Round2
    class MatchesController < ApplicationController
      include MatchInstanceVariables

      def show
        @match = Round::ROUND2.matches
          .preload(last_score_operation: [
            { question_result: { question_player_results: { player: :player_profile } } },
            :scores,
          ])
          .find_by!(match_number: params[:match_number])
        setup_instance_variables(@match)
      end
    end
  end
end

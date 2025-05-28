module Admin
  module Round2
    class MatchesController < ApplicationController
      def show
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        @scores = @match.current_scores
          .eager_load(matching: :player)
          .preload(matching: [{ player: :player_profile }, :match])
          .order("matchings.seat")
      end
    end
  end
end

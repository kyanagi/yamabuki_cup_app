module Admin
  module Round2
    class MatchesController < ApplicationController
      def show
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        @matchings = @match.matchings.preload(player: :player_profile).order(:seat)
      end
    end
  end
end

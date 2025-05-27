module Admin
  module Round2
    class MatchClosingsController < ApplicationController
      def create
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        @match.rule.judge_on_quiz_completed
        @matchings = @match.matchings.reload.preload(player: :player_profile).order(:seat)
        render "admin/round2/matches/show"
      end
    end
  end
end

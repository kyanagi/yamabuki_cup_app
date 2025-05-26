module Admin
  module Round2
    class QuestionResultsController < ApplicationController
      def create
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        ActiveRecord::Base.transaction do
          QuestionResultRegistration.create!(match: @match, player_results: params[:player_results] || [])
        end

        @matchings = @match.matchings.reload.preload(player: :player_profile).order(:seat)
        render "admin/round2/matches/show"
        # redirect_to admin_round2_path(match_number: @match.match_number)
      end
    end
  end
end

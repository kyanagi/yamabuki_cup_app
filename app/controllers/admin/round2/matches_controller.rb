module Admin
  module Round2
    class MatchesController < ApplicationController
      def show
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        @matchings = @match.matchings.preload(player: :player_profile).order(:seat)
      end

      def update
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        matching = @match.matchings.find(params[:matching_id])

        ActiveRecord::Base.transaction do
          QuestionResultRegistration.create!(matching:, result: params[:result])
        end

        @matchings = @match.matchings.reload.preload(player: :player_profile).order(:seat)
        render :show
      end
    end
  end
end

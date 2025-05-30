module Admin
  module Round2
    class QuestionClosingsController < ApplicationController
      def create
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        ActiveRecord::Base.transaction do
          QuestionClosing.create!(match: @match, question_player_results_attributes: create_params)
        end

        @scores = @match.current_scores
          .eager_load(matching: :player)
          .preload(matching: [{ player: :player_profile }, :match])
          .order("matchings.seat")

        render "admin/round2/matches/show"
      end

      private

      def create_params
        if params[:question_player_results_attributes].present?
          params.expect(question_player_results_attributes: [[:player_id, :situation, :result]])
        else
          []
        end
      end
    end
  end
end

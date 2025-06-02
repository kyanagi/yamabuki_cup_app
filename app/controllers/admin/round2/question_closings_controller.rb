module Admin
  module Round2
    class QuestionClosingsController < ApplicationController
      include MatchInstanceVariables

      def create
        match = nil
        ActiveRecord::Base.transaction do
          match = Round::ROUND2.matches
            .preload(last_score_operation: { scores: :matching })
            .find_by!(match_number: params[:match_number])
          QuestionClosing.create!(match:, question_player_results_attributes: create_params)
        end

        setup_instance_variables(match)
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

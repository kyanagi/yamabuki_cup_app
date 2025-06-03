module Admin
  class QuestionClosingsController < ApplicationController
    include MatchInstanceVariables

    def create
      match = nil
      ActiveRecord::Base.transaction do
        match = Match
          .preload(last_score_operation: { scores: :matching })
          .find(params[:match_id])
        QuestionClosing.create!(match:, question_player_results_attributes: create_params)
      end

      setup_instance_variables(match)
      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
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

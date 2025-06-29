module Admin
  class SetTransitionsController < AdminController
    include MatchInstanceVariables

    def create
      match = nil
      ActiveRecord::Base.transaction do
        match = Match
          .preload(last_score_operation: { scores: :matching })
          .find(params[:match_id])
        SetTransition.create!(match:)
      end

      broadcast_scoreboard(match)
      setup_instance_variables(match)
      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end
  end
end

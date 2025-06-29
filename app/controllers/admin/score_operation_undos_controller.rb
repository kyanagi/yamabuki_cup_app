module Admin
  class ScoreOperationUndosController < AdminController
    include MatchInstanceVariables

    def create
      match = nil
      ActiveRecord::Base.transaction do
        match = Match.find(params[:match_id])
        ScoreUndo.create!(match:)
      end

      broadcast_scoreboard(match)
      setup_instance_variables(match)
      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end
  end
end

module Admin
  class MatchClosingsController < AdminController
    include MatchInstanceVariables

    def create
      match = Match.find(params[:match_id])

      if match.rule_class == MatchRule::Round2Ura
        return head :unprocessable_entity
      end

      ActiveRecord::Base.transaction do
        match = Match
          .preload(last_score_operation: { scores: :matching })
          .find(params[:match_id])
        MatchClosing.create!(match:)
      end

      broadcast_scoreboard(match)
      setup_instance_variables(match)
      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end
  end
end

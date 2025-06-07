module Admin
  class DisqualificationsController < AdminController
    include MatchInstanceVariables

    def create
      match = nil
      ActiveRecord::Base.transaction do
        match = Match
          .preload(last_score_operation: { scores: :matching })
          .find(params[:match_id])
        Disqualification.create!(match:, player_id: params[:player_id])
      end

      setup_instance_variables(match)
      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end
  end
end

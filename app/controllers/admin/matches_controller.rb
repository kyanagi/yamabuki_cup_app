module Admin
  class MatchesController < ApplicationController
    include MatchInstanceVariables

    def index
      @rounds = Round.order(:id).where(id: 2..)
      @matches_by_round_id = Match.order(:id).group_by(&:round_id)
    end

    def show
      @match = Match.find(params[:id])
      setup_instance_variables(@match)

      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end
  end
end

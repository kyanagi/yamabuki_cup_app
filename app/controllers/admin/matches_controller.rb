module Admin
  class MatchesController < ApplicationController
    include MatchInstanceVariables

    def show
      @match = Match.find(params[:id])
      setup_instance_variables(@match)

      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end
  end
end

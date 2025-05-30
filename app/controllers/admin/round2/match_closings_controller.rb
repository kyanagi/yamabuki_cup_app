module Admin
  module Round2
    class MatchClosingsController < ApplicationController
      include MatchInstanceVariables

      def create
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        ActiveRecord::Base.transaction do
          MatchClosing.create!(match: @match)
        end

        setup_instance_variables(@match)
        render "admin/round2/matches/show"
      end
    end
  end
end

module Admin
  module Round2
    class MatchesController < ApplicationController
      include MatchInstanceVariables

      def show
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        setup_instance_variables(@match)
      end
    end
  end
end

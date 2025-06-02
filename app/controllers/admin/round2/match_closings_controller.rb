module Admin
  module Round2
    class MatchClosingsController < ApplicationController
      include MatchInstanceVariables

      def create
        match = nil
        ActiveRecord::Base.transaction do
          match = Round::ROUND2.matches
            .preload(last_score_operation: { scores: :matching })
            .find_by!(match_number: params[:match_number])
          MatchClosing.create!(match:)
        end

        setup_instance_variables(match)
        render "admin/round2/matches/show"
      end
    end
  end
end

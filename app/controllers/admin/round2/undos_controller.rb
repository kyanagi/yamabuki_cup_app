module Admin
  module Round2
    class UndosController < ApplicationController
      include MatchInstanceVariables

      def create
        match = nil
        ActiveRecord::Base.transaction do
          match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
          ScoreUndo.create!(match:)
        end

        setup_instance_variables(match)
        render "admin/round2/matches/show"
      end
    end
  end
end

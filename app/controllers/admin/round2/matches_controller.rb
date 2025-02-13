module Admin
  module Round2
    class MatchesController < ApplicationController
      def show
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        @matchings = @match.matchings.preload(player: :player_profile).order(:seat)
      end

      def update
        @match = Round::ROUND2.matches.find_by!(match_number: params[:match_number])
        matching = @match.matchings.find(params[:matching_id])

        ApplicationRecord.transaction do
          question_order = (QuestionAllocation.maximum(:order) || 0) + 1
          question_allocation = QuestionAllocation.create!(
            match: @match,
            question_id: 1, #params[:question_id],
            order: question_order
          )

          question_result = QuestionResult.new(question_allocation:)
          question_result.question_player_results.build(
            player_id: matching.player_id,
            result: params[:result],
            situation: "pushed"
          )
          question_result.save!

          @match.rule.process(question_result.question_player_results)
        end

        @matchings = @match.matchings.reload.preload(player: :player_profile).order(:seat)
        render :show
      end
    end
  end
end

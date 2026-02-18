module Admin
  class Round2UraQualifiersController < AdminController
    def edit
      @match = Match.find(params[:match_id])
      @matchings = @match.matchings.includes(player: :player_profile).order(:seat)
      @current_ranks = current_ranks_from(@match)
      @qualifier_input = Round2UraQualifierInput.new(match: @match)
    end

    def update
      @match = Match.find(params[:match_id])
      @qualifier_input = Round2UraQualifierInput.new(
        match: @match,
        rank_by_matching_id: qualifier_params
      )

      if @qualifier_input.save
        redirect_to edit_admin_match_round2_ura_qualifier_path(match_id: @match.id),
                    notice: "勝抜け者を登録しました"
      else
        @matchings = @match.matchings.includes(player: :player_profile).order(:seat)
        @current_ranks = current_ranks_from(@match)
        render :edit, status: :unprocessable_entity
      end
    end

    private

    def qualifier_params
      return {} unless params[:round2_ura_qualifier_input]

      params.expect(round2_ura_qualifier_input: { rank_by_matching_id: {} })
        .fetch(:rank_by_matching_id, {})
        .to_h
    end

    def current_ranks_from(match)
      return {} unless match.last_score_operation

      match.current_scores.each_with_object({}) do |score, hash|
        hash[score.matching_id.to_s] = score.rank.to_s
      end
    end
  end
end

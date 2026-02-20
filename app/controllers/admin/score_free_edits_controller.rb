module Admin
  class ScoreFreeEditsController < AdminController
    def edit
      @match = Match.find(params[:match_id])
      return head :unprocessable_entity unless ScoreFreeEditInput.editable_for?(@match.rule_class)

      setup_form_variables(@match)
      @score_free_edit_input = ScoreFreeEditInput.new(match: @match)
    end

    def update
      @match = Match.find(params[:match_id])
      return head :unprocessable_entity unless ScoreFreeEditInput.editable_for?(@match.rule_class)

      @score_free_edit_input = ScoreFreeEditInput.new(
        match: @match,
        scores_by_matching_id: score_free_edit_params
      )

      if @score_free_edit_input.save
        redirect_to edit_admin_match_score_free_edit_path(match_id: @match.id),
                    notice: "得点状況を更新しました"
      else
        setup_form_variables(@match)
        render :edit, status: :unprocessable_entity
      end
    end

    private

    def score_free_edit_params
      return {} unless params[:score_free_edit_input]

      params
        .require(:score_free_edit_input)
        .permit(scores_by_matching_id: [:status, :points, :misses, :rank, :stars])
        .fetch(:scores_by_matching_id, {})
        .to_h
    end

    def setup_form_variables(match)
      @matchings = match.matchings.includes(player: :player_profile).order(:seat)
      @editable_fields = ScoreFreeEditInput.editable_fields_for(match.rule_class)
      @status_options = ScoreFreeEditInput.status_options_for(match.rule_class)
      @current_scores_by_matching_id = current_scores_by_matching_id(match)
    end

    def current_scores_by_matching_id(match)
      scores = match.current_scores.index_by { |score| score.matching_id.to_s }

      match.matchings.each_with_object({}) do |matching, hash|
        score = scores[matching.id.to_s]
        initial = match.rule.initial_score_attributes_of(matching.seat)

        hash[matching.id.to_s] = {
          "status" => score&.status || initial[:status],
          "points" => score&.points || initial[:points],
          "misses" => score&.misses || initial[:misses],
          "rank" => score&.rank,
          "stars" => score&.stars || 0,
        }
      end
    end
  end
end

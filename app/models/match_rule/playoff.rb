module MatchRule
  class Playoff < Base
    NUM_SEATS = 10
    NUM_BUTTONS = 10
    NUM_WINNERS = 1
    INITIAL_POINTS = 10
    ADMIN_VIEW_TEMPLATE = "playoff"

    # @rbs override
    # @rbs score_operation: QuestionClosing
    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_question_closing(score_operation, question_player_results)
      @score_operation = score_operation
      prepare_new_scores(score_operation)

      if question_player_results.empty?
        process_through
      elsif question_player_results.any?(&:result_correct?)
        process_correct(question_player_results)
      else
        process_wrong(question_player_results)
      end

      disqualify_players_with_no_points
      judge_on_quiz_completed if @scores.count(&:status_playing?) <= self.class::NUM_WINNERS
    end

    # @rbs override
    # @rbs score_operation: ScoreOperation
    # @rbs return: String
    def summarize_score_operation(score_operation)
      case score_operation
      when QuestionClosing
        player_results = score_operation.question_result.question_player_results
        return "スルー" if player_results.empty?

        player_results.map(&:to_s).join(", ")
      else
        super
      end
    end

    private

    # @rbs override
    # @rbs return: void
    def judge_on_quiz_completed
      num_left_winners = self.class::NUM_WINNERS - @scores.count(&:status_win?)
      return if num_left_winners <= 0

      targets = @scores.select(&:status_playing?)
      targets.sort_by! { [-it.points, it.matching.seat] }
      targets.first(num_left_winners).each do |score|
        mark_as_winner(score)
        score.mark_as_score_changed
      end
    end

    # @rbs override
    # @rbs (Integer) -> Integer
    def initial_points_of(_seat)
      INITIAL_POINTS
    end

    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_correct(question_player_results)
      correct_player_ids = question_player_results.select(&:result_correct?).map(&:player_id)
      @scores.each do |score|
        next unless score.status_playing?
        next if correct_player_ids.include?(score.matching.player_id)

        score.points -= 1
        score.mark_as_score_changed
      end
    end

    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_wrong(question_player_results)
      wrong_player_ids = question_player_results.each_with_object(Set.new) do |result, ids|
        ids << result.player_id if result.result_wrong?
      end
      @scores.each do |score|
        next unless score.status_playing?
        next unless wrong_player_ids.include?(score.matching.player_id)

        score.points -= 1
        score.mark_as_score_changed
      end
    end

    # @rbs return: void
    def process_through
      playing_scores = @scores.select(&:status_playing?)
      return if playing_scores.all? { it.points <= 1 }

      playing_scores.each do |score|
        score.points -= 1
        score.mark_as_score_changed
      end
    end

    # @rbs return: void
    def disqualify_players_with_no_points
      targets = @scores.select { it.status_playing? && it.points <= 0 }
      targets.sort_by! { [it.points, -it.matching.seat] }

      targets.each do |score|
        mark_as_loser(score)
        score.mark_as_score_changed
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_winner(score)
      score.status = "win"
      score.rank = Score.highest_vacant_rank(@scores)
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_loser(score)
      score.status = "lose"
      score.rank = Score.lowest_vacant_rank(@scores)
    end
  end
end

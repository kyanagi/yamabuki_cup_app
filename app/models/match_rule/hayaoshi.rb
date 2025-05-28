module MatchRule
  module Hayaoshi
    # include したクラスで以下の定数を定義すること
    # * NUM_SEATS
    # * NUM_BUTTONS
    # * NUM_WINNERS
    # * POINTS_TO_WIN
    # * MISSES_TO_LOSE

    # @rbs override
    # @rbs score_operation: QuestionClosing
    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_question_closing(score_operation, question_player_results)
      @score_operation = score_operation
      prepare_new_scores(score_operation)

      question_player_results.each do |question_player_result|
        s = @scores.find { |score| score.matching.player_id == question_player_result.player_id }
        next unless s.status_playing?

        if question_player_result.result_correct?
          process_correct(s)
        elsif question_player_result.result_wrong?
          process_wrong(s)
        end
      end
    end

    private

    # @rbs override
    # @rbs return: void
    def judge_on_quiz_completed
      num_left_winners = self.class::NUM_WINNERS - @scores.count(&:status_win?)
      return if num_left_winners <= 0

      judgment_targets = @scores.select { it.status.in?(["playing", "waiting"]) }
      sort_players_by_ranking_criteria!(judgment_targets)
      judgment_targets.first(num_left_winners).each do |score|
        mark_as_winner(score)
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def process_correct(score)
      score.points += 1
      if score.points >= self.class::POINTS_TO_WIN
        mark_as_winner(score)
      end
      fill_vacant_buttons_with_waiting_players
    end

    # @rbs score: Score
    # @rbs return: void
    def process_wrong(score)
      score.misses += 1
      if score.misses >= self.class::MISSES_TO_LOSE
        mark_as_loser(score)
      end
      fill_vacant_buttons_with_waiting_players

      # トビ残り
      if num_left_players_is_equal_to_num_left_winners?
        judge_on_quiz_completed
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

    # @rbs return: void
    def fill_vacant_buttons_with_waiting_players
      n = self.class::NUM_BUTTONS - @scores.count(&:status_playing?)
      return if n <= 0

      promoting_players = @scores.select(&:status_waiting?).sort_by { |s| s.matching.seat }.first(n)
      promoting_players.each do |score|
        score.status = "playing"
      end
    end

    # @rbs return: bool
    def num_left_players_is_equal_to_num_left_winners?
      @scores.count(&:status_lose?) == self.class::NUM_SEATS - self.class::NUM_WINNERS
    end

    # @rbs matchings: Array[Matching]
    # @rbs return: void
    def sort_players_by_ranking_criteria!(scores)
      scores.sort_by! { |s| [-s.points, s.misses, s.matching.seat] }
    end
  end
end

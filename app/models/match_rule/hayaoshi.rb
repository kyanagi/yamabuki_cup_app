module MatchRule
  module Hayaoshi
    # include したクラスで以下の定数を定義すること
    # * NUM_SEATS
    # * NUM_BUTTONS
    # * NUM_WINNERS
    # * POINTS_TO_WIN
    # * MISSES_TO_LOSE

    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process(question_player_results)
      question_player_results.each do |question_player_result|
        m = @matchings.find { |matching| matching.player_id == question_player_result.player_id }
        next unless m.status_playing?

        if question_player_result.result_correct?
          process_correct(m)
        elsif question_player_result.result_wrong?
          process_wrong(m)
        end

        m.save!
      end
    end

    # @rbs return: void
    def judge_on_quiz_completed
      num_left_winners = self.class::NUM_WINNERS - @matchings.count(&:status_win?)
      return if num_left_winners <= 0

      judgment_targets = @matchings.select { it.status.in?(["playing", "waiting"]) }
      sort_players_by_ranking_criteria!(judgment_targets)
      judgment_targets.first(num_left_winners).each do |matching|
        mark_as_winner(matching)
        matching.save!
      end
    end

    private

    # @rbs matching: Matching
    # @rbs return: void
    def process_correct(matching)
      matching.points += 1
      if matching.points >= self.class::POINTS_TO_WIN
        mark_as_winner(matching)
      end
      fill_vacant_buttons_with_waiting_players
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_wrong(matching)
      matching.misses += 1
      if matching.misses >= self.class::MISSES_TO_LOSE
        mark_as_loser(matching)
      end
      fill_vacant_buttons_with_waiting_players

      # トビ残り
      if num_left_players_is_equal_to_num_left_winners?
        judge_on_quiz_completed
      end
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_winner(matching)
      matching.status = "win"
      matching.rank = Matching.highest_vacant_rank(@match)
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_loser(matching)
      matching.status = "lose"
      matching.rank = Matching.lowest_vacant_rank(@match)
    end

    # @rbs return: void
    def fill_vacant_buttons_with_waiting_players
      n = self.class::NUM_BUTTONS - @matchings.count(&:status_playing?)
      return if n <= 0

      @matchings.select(&:status_waiting?).sort_by(&:seat).first(n).each(&:status_playing!)
    end

    # @rbs return: bool
    def num_left_players_is_equal_to_num_left_winners?
      @matchings.count(&:status_lose?) == self.class::NUM_SEATS - self.class::NUM_WINNERS
    end

    # @rbs matchings: Array[Matching]
    # @rbs return: void
    def sort_players_by_ranking_criteria!(matchings)
      matchings.sort_by! { |m| [-m.points, m.misses, m.seat] }
    end
  end
end

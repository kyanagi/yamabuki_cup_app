module MatchRule
  module Hayabo
    # include したクラスで以下の定数を定義すること
    # * NUM_SEATS
    # * NUM_BUTTONS
    # * NUM_WINNERS
    # * POINTS_TO_WIN
    # * POINTS_ON_PUSHED_CORRECT
    # * POINTS_ON_UNPUSHED_CORRECT
    # * POINTS_ON_PUSHED_WRONG
    # * POINTS_ON_UNPUSHED_WRONG
    # * BONUS_POINTS_ON_SOLE_CORRECT

    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process(question_player_results)
      is_sole_correct = question_player_results.one?(&:result_correct?)

      question_player_results.each do |question_player_result|
        m = @matchings.find { |matching| matching.player_id == question_player_result.player_id }
        next unless m.status_playing?

        case [question_player_result.situation_pushed?, question_player_result.result_correct?]
        when [true, true]
          process_pushed_correct(m, is_sole_correct)
        when [true, false]
          process_pushed_wrong(m)
        when [false, true]
          process_unpushed_correct(m, is_sole_correct)
        when [false, false]
          process_unpushed_wrong(m)
        end
      end

      promote_and_save_new_winners

      @matchings.each(&:save!)
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
    def process_pushed_correct(matching, is_sole_correct)
      matching.points += self.class::POINTS_ON_PUSHED_CORRECT
      matching.points += self.class::BONUS_POINTS_ON_SOLE_CORRECT if is_sole_correct
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_unpushed_correct(matching, is_sole_correct)
      matching.points += self.class::POINTS_ON_UNPUSHED_CORRECT
      matching.points += self.class::BONUS_POINTS_ON_SOLE_CORRECT if is_sole_correct
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_pushed_wrong(matching)
      matching.points += self.class::POINTS_ON_PUSHED_WRONG
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_unpushed_wrong(matching)
      matching.points += self.class::POINTS_ON_UNPUSHED_WRONG
    end

    # 新たに勝ち抜けポイントを超えた選手を勝者として記録する。
    # @rbs return: void
    def promote_and_save_new_winners
      num_left_winners = self.class::NUM_WINNERS - @matchings.count(&:status_win?)
      return if num_left_winners <= 0

      new_winner_candidates = @matchings.select { (it.status_playing? || it.status_waiting?) && it.points >= self.class::POINTS_TO_WIN }
      new_winner_candidates.sort_by! { [-it.points, it.seat] }
      new_winner_candidates.first(num_left_winners).each do |matching|
        mark_as_winner(matching)
        matching.save!
      end
    end

    # @rbs matching: Matching
    # @rbs return: void
    def mark_as_winner(matching)
      matching.status = "win"
      matching.rank = Matching.highest_vacant_rank(@match)
    end

    # @rbs matchings: Array[Matching]
    # @rbs return: void
    def sort_players_by_ranking_criteria!(matchings)
      matchings.sort_by! { [-it.points, it.seat] }
    end
  end
end

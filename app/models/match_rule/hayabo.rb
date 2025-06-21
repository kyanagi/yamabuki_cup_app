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

    # @rbs override
    # @rbs score_operation: QuestionClosing
    # @rbs question_player_results: Array[QuestionPlayerResult]
    # @rbs return: void
    def process_question_closing(score_operation, question_player_results)
      @score_operation = score_operation
      prepare_new_scores(score_operation)

      is_sole_correct = question_player_results.one?(&:result_correct?)

      question_player_results.each do |question_player_result|
        s = @scores.find { |score| score.matching.player_id == question_player_result.player_id }
        next unless s.status_playing?

        case [question_player_result.situation_pushed?, question_player_result.result_correct?]
        when [true, true]
          process_pushed_correct(s, is_sole_correct)
        when [true, false]
          process_pushed_wrong(s)
        when [false, true]
          process_unpushed_correct(s, is_sole_correct)
        when [false, false]
          process_unpushed_wrong(s)
        end
      end

      promote_new_winners
    end

    # @rbs override
    # @rbs score_operation: ScoreOperation
    # @rbs return: String
    def summarize_score_operation(score_operation)
      case score_operation
      when QuestionClosing
        player_results = score_operation.question_result.question_player_results
        h = player_results.group_by(&:situation_pushed?)
        pushed_result = h[true]&.first
        unpushed_results = h[false] || []

        text = ""
        if pushed_result
          text << pushed_result.to_s(correct: "◎")
        else
          text << "スルー"
        end

        text << "／"

        unpushed_correct_results = unpushed_results.select(&:result_correct?)
        if unpushed_correct_results.empty?
          text << "ボード正解者なし"
        else
          names = unpushed_correct_results.map { |result| result.player.player_profile.family_name }.join(",")
          text << "◯#{names}"
        end
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

      judgment_targets = @scores.select { it.status.in?(["playing", "waiting"]) }
      sort_players_by_ranking_criteria!(judgment_targets)
      judgment_targets.first(num_left_winners).each do |score|
        mark_as_winner(score)
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def process_pushed_correct(score, is_sole_correct)
      score.points += self.class::POINTS_ON_PUSHED_CORRECT
      score.points += self.class::BONUS_POINTS_ON_SOLE_CORRECT if is_sole_correct
    end

    # @rbs score: Score
    # @rbs return: void
    def process_unpushed_correct(score, is_sole_correct)
      score.points += self.class::POINTS_ON_UNPUSHED_CORRECT
      score.points += self.class::BONUS_POINTS_ON_SOLE_CORRECT if is_sole_correct
    end

    # @rbs score: Score
    # @rbs return: void
    def process_pushed_wrong(score)
      score.points += self.class::POINTS_ON_PUSHED_WRONG
    end

    # @rbs score: Score
    # @rbs return: void
    def process_unpushed_wrong(score)
      score.points += self.class::POINTS_ON_UNPUSHED_WRONG
    end

    # 新たに勝ち抜けポイントを超えた選手を勝者として記録する。
    # @rbs return: void
    def promote_new_winners
      num_left_winners = self.class::NUM_WINNERS - @scores.count(&:status_win?)
      return if num_left_winners <= 0

      new_winner_candidates = @scores.select { (it.status_playing? || it.status_waiting?) && it.points >= self.class::POINTS_TO_WIN }
      new_winner_candidates.sort_by! { [-it.points, it.matching.seat] }
      new_winner_candidates.first(num_left_winners).each do |score|
        mark_as_winner(score)
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_winner(score)
      score.status = "win"
      score.rank = Score.highest_vacant_rank(@scores)
    end

    # @rbs matchings: Array[Matching]
    # @rbs return: void
    def sort_players_by_ranking_criteria!(scores)
      scores.sort_by! { [-it.points, it.matching.seat] }
    end
  end
end

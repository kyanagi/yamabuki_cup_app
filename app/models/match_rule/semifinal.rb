module MatchRule
  # 準決勝
  #
  # implementation notes:
  # そのセットに参加しない人（既に負けた人）は、scores.points の値が負になっている。
  class Semifinal < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4
    ADMIN_VIEW_TEMPLATE = "board"

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

    # @rbs score_operation: ScoreOperation
    # @rbs return: void
    def process_set_transition(score_operation)
      prepare_new_scores(score_operation)
      @scores.each do |score|
        if score.status_playing?
          score.points = 0
        else
          # 新しいセットに参加しない人（既に負けた人）は、区別がつくように points を -10000 にする
          score.points = -10000
        end
      end
    end

    # @rbs score_operation: ScoreOperation
    # @rbs player_id: Integer
    # @rbs return: void
    def process_disqualification(score_operation)
      prepare_new_scores(score_operation)
      s = @scores.find { |score| score.matching.player_id == score_operation.player_id }

      mark_as_loser(s)
    end

    # @rbs override
    # @rbs score_operation: ScoreOperation
    # @rbs return: String
    def summarize_score_operation(score_operation)
      case score_operation
      when QuestionClosing
        player_results = score_operation.question_result.question_player_results
        correct_results = player_results.select(&:result_correct?)
        if correct_results.empty?
          "正解者なし"
        else
          names = correct_results.map { |result| result.player.player_profile.family_name }.join(",")
          "◯#{names}"
        end
      when MatchClosing
        "勝抜け者確定"
      else
        super
      end
    end

    private

    # @rbs override
    # @rbs return: void
    def judge_on_quiz_completed
      @scores.select(&:status_playing?).each do |score|
        score.status = "win"
      end
    end

    # @rbs score: Score
    # @rbs return: void
    def process_correct(score)
      score.points += 1
    end

    # @rbs score: Score
    # @rbs return: void
    def process_wrong(score)
      # noop
    end

    # @rbs score: Score
    # @rbs return: void
    def mark_as_loser(score)
      score.status = "lose"
    end
  end
end

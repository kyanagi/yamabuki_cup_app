module MatchRule
  class Semifinal < Base
    NUM_SEATS = 8
    NUM_BUTTONS = 8
    NUM_WINNERS = 4

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

    def start_new_set
      @matchings.update_all(points: 0)
    end

    def disqualify(player_id:)
      m = @matchings.find { |matching| matching.player_id == player_id }

      mark_as_lower(m)
      m.save!
    end

    # @rbs return: void
    def judge_on_quiz_completed
      winners = @matchings.select(&:status_playing?)
      winners.each do |matching|
        matching.status = "win"
        matching.save!
      end
    end

    private

    # @rbs matching: Matching
    # @rbs return: void
    def process_correct(matching)
      matching.points += 1
    end

    # @rbs matching: Matching
    # @rbs return: void
    def process_wrong(matching)
      # noop
    end

    def mark_as_lower(matching)
      matching.status = "lose"
    end
  end
end

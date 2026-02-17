module ApplicationHelper
  ROUND2_OMOTE_RANKS = Matchmaking::Round2::OMOTE_RANKS_BY_GROUP.flatten.freeze
  ROUND2_ADVANTAGED_RANKS = Matchmaking::Round2::OMOTE_RANKS_BY_GROUP.flat_map { it.first(3) }.freeze

  # @rbs rank Integer
  # @rbs return bool
  def round3_seeded?(rank)
    (1..Matchmaking::Round2::NUM_SEED_PLAYERS).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_omote?(rank)
    ROUND2_OMOTE_RANKS.include?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_ura?(rank)
    rank && rank >= 58
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_advantage?(rank)
    ROUND2_ADVANTAGED_RANKS.include?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_normal?(rank)
    round2_omote?(rank) && !round2_advantage?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_waiting?(_rank)
    false
  end

  # @rbs rank Integer
  # @rbs return String
  def round2_rank_color_class(rank)
    if round3_seeded?(rank)
      "is-danger"
    elsif round2_omote?(rank)
      "is-info"
    elsif round2_ura?(rank)
      "is-warning"
    else
      ""
    end
  end

  # @rbs status String
  # @rbs return String
  def player_button_color(status)
    case status
    when "playing", "set_win"
      "is-info"
    else
      "has-background-grey-lighter"
    end
  end

  # @rbs status String
  # @rbs return String
  def player_status_color(status)
    case status
    when "playing"
      ""
    when "win"
      "is-success"
    when "set_win"
      "is-info"
    when "lose", "waiting"
      "has-background-grey-lighter"
    end
  end

  # @rbs status String
  # @rbs statuses Array[String]
  # @rbs return bool
  def final_round_player_button_disabled?(status, statuses)
    if statuses.include?("set_win")
      status != "set_win"
    else
      status != "playing"
    end
  end

  def scoreboard_hayaoshi_player_previous_result_class(score_operation, player_id)
    question_player_result = score_operation.question_result&.question_player_results&.find { it.player_id == player_id }
    return nil unless question_player_result
    if question_player_result.situation_pushed?
      "player__previous-result--#{question_player_result.result}"
    end
  end

  def scoreboard_hayabo_player_previous_situation_class(score_operation, player_id)
    question_player_result = score_operation.question_result&.question_player_results&.find { it.player_id == player_id }
    "hayabo-player__previous-situation--#{question_player_result.situation}" if question_player_result
  end

  def scoreboard_hayabo_player_previous_result_class(score_operation, player_id)
    question_player_result = score_operation.question_result&.question_player_results&.find { it.player_id == player_id }
    return nil unless question_player_result
    if question_player_result.situation_pushed? || question_player_result.result_correct?
      "player__previous-result--#{question_player_result.result}"
    end
  end
end

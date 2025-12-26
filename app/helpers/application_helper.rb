module ApplicationHelper
  # @rbs rank Integer
  # @rbs return bool
  def round2_seeded?(rank)
    (1..Matchmaking::Round2::NUM_SEED_PLAYERS).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_advantage?(rank)
    first = Matchmaking::Round2::NUM_SEED_PLAYERS + 1
    num_round2_matches = 5
    num_advantaged_players = MatchRule::Round2::NUM_ADVANTAGED_PLAYERS * num_round2_matches
    (first...(first+num_advantaged_players)).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_normal?(rank)
    num_round2_matches = 5
    first = Matchmaking::Round2::NUM_SEED_PLAYERS + (MatchRule::Round2::NUM_ADVANTAGED_PLAYERS * num_round2_matches) + 1
    num_normal = (MatchRule::Round2::NUM_BUTTONS - MatchRule::Round2::NUM_ADVANTAGED_PLAYERS) * num_round2_matches
    (first...(first+num_normal)).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_waiting?(rank)
    num_round2_matches = 5
    first = Matchmaking::Round2::NUM_SEED_PLAYERS + (MatchRule::Round2::NUM_BUTTONS * num_round2_matches) + 1
    num_waiting = (MatchRule::Round2::NUM_SEATS - MatchRule::Round2::NUM_BUTTONS) * num_round2_matches
    (first...(first+num_waiting)).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return String
  def round2_rank_color_class(rank)
    if round2_seeded?(rank)
      "is-danger"
    elsif round2_advantage?(rank)
      "is-info"
    elsif round2_normal?(rank)
      "is-warning"
    elsif round2_waiting?(rank)
      "is-success"
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

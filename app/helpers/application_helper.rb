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
    num_advantaged_players = MatchRule::Round2::NUM_ADVANTAGED_PLAYERS * Round::ROUND2.matches.size
    (first...first+num_advantaged_players).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_normal?(rank)
    first = Matchmaking::Round2::NUM_SEED_PLAYERS + (MatchRule::Round2::NUM_ADVANTAGED_PLAYERS * Round::ROUND2.matches.size) + 1
    num_normal = (MatchRule::Round2::NUM_BUTTONS - MatchRule::Round2::NUM_ADVANTAGED_PLAYERS) * Round::ROUND2.matches.size
    (first...first+num_normal).cover?(rank)
  end

  # @rbs rank Integer
  # @rbs return bool
  def round2_waiting?(rank)
    first = Matchmaking::Round2::NUM_SEED_PLAYERS + (MatchRule::Round2::NUM_BUTTONS * Round::ROUND2.matches.size) + 1
    num_waiting = (MatchRule::Round2::NUM_SEATS - MatchRule::Round2::NUM_BUTTONS) * Round::ROUND2.matches.size
    (first...first+num_waiting).cover?(rank)
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

  def player_button_color(status)
    if status == "playing"
      "is-info"
    else
      "has-background-grey-lighter"
    end
  end

  def player_status_color(status)
    case status
    when "playing"
      ""
    when "win"
      "is-success"
    when "lose", "waiting"
      "has-background-grey-lighter"
    end
  end
end

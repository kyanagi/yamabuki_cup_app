class HomeController < PublicController
  def show
    if session[:registration_completed]
      session.delete(:registration_completed)
      render :registration_completed
      return
    end

    @round2_group_on_mypage = round2_group_on_mypage
  end

  private

  def round2_group_on_mypage
    return unless Setting.round2_group_visible_on_mypage

    round2_matching = Current.player.matchings
      .joins(:match)
      .where(matches: { round_id: Round::ROUND2.id })
      .order("matches.match_number")
      .first

    return "2R#{round2_matching.match.name}" if round2_matching
    "2Rシード（2R参加なし）" if round2_seeded_player_after_matchmaking?
  end

  def round2_seeded_player_after_matchmaking?
    return false unless Matchmaking::Round2.done?

    rank = Current.player.yontaku_player_result&.rank
    rank.in?(1..Matchmaking::Round2::NUM_SEED_PLAYERS)
  end
end

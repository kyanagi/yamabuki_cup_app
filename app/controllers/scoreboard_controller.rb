class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    match = Round::ROUND2.matches[0]
    @ranks = match.matchings.map { |m| m.player.yontaku_player_result.rank }.sort

    @scores = match.current_scores.sort_by { it.matching.seat }
    @score_operation = match.last_score_operation
    render(
      inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/announcement/display', locals: { text: 'あいうえおかきくけこさしすせそたちつてとなにぬねのほげほげ' } } %>", # rubocop:disable Layout/LineLength
      layout: "scoreboard"
    )
  end
end

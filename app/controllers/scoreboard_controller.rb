class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    @ranks = Round::ROUND2.matches[0].matchings.order(:seat).map { it.player.yontaku_player_result.rank }
    render(
      inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/round2_announcement/init', locals: { ranks: @ranks } } %>",
      layout: "scoreboard"
    )
  end
end

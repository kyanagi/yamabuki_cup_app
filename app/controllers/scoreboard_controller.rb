class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    match = Round::ROUND3.matches[2]
    @scores = match.current_scores.sort_by { it.matching.seat }
    render(
      inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/hayabo/init', locals: { scores: @scores } } %>",
      layout: "scoreboard"
    )
  end
end

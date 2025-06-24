class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    match = Round::ROUND3.matches[0]
    @scores = match.current_scores.sort_by { it.matching.seat }
    @score_operation = match.last_score_operation
    render(
      inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/paper_seed/display' } %>",
      layout: "scoreboard"
    )
  end
end

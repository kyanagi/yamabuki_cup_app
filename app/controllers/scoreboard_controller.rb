class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    match = Round::ROUND3.matches[0]
    @scores = match.current_scores.sort_by { it.matching.seat }
    @score_operation = match.last_score_operation
    render(
      inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/hayaoshi/init', locals: { scores: @scores, score_operation: @score_operation } } %>",
      layout: "scoreboard"
    )
  end
end

class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    match = Round::FINAL.matches[0]
    @scores = match.current_scores.sort_by { it.matching.seat }
    @score_operation = match.last_score_operation
    render(
      inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/final/init', locals: { scores: @scores, score_operation: @score_operation } } %>", # rubocop:disable Layout/LineLength
      layout: "scoreboard"
    )
  end
end

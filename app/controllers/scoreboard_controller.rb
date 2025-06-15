class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    render inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/round2/init' } %>", layout: "scoreboard"
  end
end

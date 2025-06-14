class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    render inline: "<%= content_for(:scoreboard) { render partial: 'scoreboard/paper_seed/init' } %>", layout: "scoreboard"
  end
end

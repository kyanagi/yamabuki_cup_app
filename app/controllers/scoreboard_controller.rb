class ScoreboardController < ApplicationController
  layout "scoreboard"

  def show
  end

  def test
    render inline: "<%= content_for(:scoreboard) { render 'scoreboard/paper_top/init' } %>", layout: "scoreboard"
  end
end

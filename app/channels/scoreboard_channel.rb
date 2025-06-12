class ScoreboardChannel < ApplicationCable::Channel
  def subscribed
    stream_from "scoreboard"
    logger.debug("subscribed")
  end

  def unsubscribed
    logger.debug("unsubscribed")
  end
end

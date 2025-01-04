class ScoreboardChannel < ApplicationCable::Channel
  def subscribed
    stream_from "scoreboard"
    logger.debug("subscribed")
    ActionCable.server.broadcast("scoreboard", { message: "someone subscribed" })
  end

  def unsubscribed
    logger.debug("unsubscribed")
  end
end

class ScoreboardChannel < ApplicationCable::Channel
  def subscribed
    stream_from "scoreboard"
    logger.debug("subscribed")

    players = Array.new(10) do |i|
      {
        paperRank: i+1,
        familyName: "山吹",
        givenName: "太郎",
        points: 1,
        wrong: 0,
        status: "playing",
        displayed: true,
      }
    end

    ActionCable.server.broadcast("scoreboard", { players: })
  end

  def unsubscribed
    logger.debug("unsubscribed")
  end
end

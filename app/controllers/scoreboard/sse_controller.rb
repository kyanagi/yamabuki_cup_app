module Scoreboard
  class SseController < ApplicationController
    include ActionController::Live

    def stream
      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["X-Accel-Buffering"] = "no"

      queue = Thread::Queue.new
      subscribers = []
      heartbeat = nil

      subscribers << ActiveSupport::Notifications.subscribe("scoreboard.update") do |*, payload|
        queue.push({ event: "match_update", data: payload[:payload] })
      end
      subscribers << ActiveSupport::Notifications.subscribe("scoreboard.match_init") do |*, payload|
        queue.push({ event: "match_init", data: payload[:payload] })
      end
      subscribers << ActiveSupport::Notifications.subscribe("scoreboard.show_scores") do |*|
        queue.push({ event: "show_scores", data: {} })
      end
      subscribers << ActiveSupport::Notifications.subscribe("scoreboard.hide_scores") do |*|
        queue.push({ event: "hide_scores", data: {} })
      end

      heartbeat = Thread.new do
        loop do
          sleep(15)
          queue.push({ event: "heartbeat", data: {} })
        end
      end

      loop do
        msg = queue.pop
        Scoreboard::SseWriter.write(response.stream, msg[:event], msg[:data])
      end
    rescue ActionController::Live::ClientDisconnected, IOError
      # クライアント切断
    ensure
      heartbeat&.kill
      subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      response.stream.close
    end
  end
end

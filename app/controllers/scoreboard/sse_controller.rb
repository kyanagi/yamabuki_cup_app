module Scoreboard
  class SseController < ApplicationController
    include ActionController::Live

    def stream
      response.headers["Content-Type"] = "text/event-stream"
      response.headers["Cache-Control"] = "no-cache"
      response.headers["X-Accel-Buffering"] = "no"

      queue = Thread::Queue.new
      subscriptions = nil
      heartbeat = nil

      subscriptions = Scoreboard::SseSubscriptions.new(queue)
      subscriptions.subscribe_all
      heartbeat = start_heartbeat(queue)

      loop do
        msg = queue.pop
        Scoreboard::SseWriter.write(response.stream, msg[:event], msg[:data])
      end
    rescue ActionController::Live::ClientDisconnected, IOError
      # クライアント切断
    ensure
      heartbeat&.kill
      subscriptions&.unsubscribe_all
      response.stream.close
    end

    private

    def start_heartbeat(queue)
      Thread.new do
        loop do
          sleep(15)
          queue.push({ event: "heartbeat", data: {} })
        end
      end
    end
  end
end

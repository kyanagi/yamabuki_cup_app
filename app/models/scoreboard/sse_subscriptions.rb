module Scoreboard
  class SseSubscriptions
    # @rbs queue: Thread::Queue
    def initialize(queue)
      @queue = queue
      @subscribers = []
    end

    # 6イベントを購読する。多重購読ガード付き（2回目以降は何もしない）。
    def subscribe_all
      return if @subscribers.any?

      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.update") do |*, payload|
        @queue.push({ event: "match_update", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.match_init") do |*, payload|
        @queue.push({ event: "match_init", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.show_scores") do |*|
        @queue.push({ event: "show_scores", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.hide_scores") do |*|
        @queue.push({ event: "hide_scores", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.question_show") do |*, payload|
        @queue.push({ event: "question_show", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.question_clear") do |*|
        @queue.push({ event: "question_clear", data: {} })
      end
    end

    def unsubscribe_all
      @subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      @subscribers.clear
    end
  end
end

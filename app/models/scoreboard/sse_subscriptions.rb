module Scoreboard
  # SSE 接続ごとのキューを EventBroadcaster に登録・解除する薄いラッパー。
  # イベントの記録・配信ロジックは EventBroadcaster に集約されている。
  class SseSubscriptions
    # @rbs queue: Thread::Queue
    def initialize(queue)
      @queue = queue
      @registered = false
    end

    # 多重登録ガード付き（2回目以降は何もしない）
    def subscribe_all
      return if @registered

      Scoreboard::EventBroadcaster.instance.register(@queue)
      @registered = true
    end

    def unsubscribe_all
      return unless @registered

      Scoreboard::EventBroadcaster.instance.unregister(@queue)
      @registered = false
    end
  end
end

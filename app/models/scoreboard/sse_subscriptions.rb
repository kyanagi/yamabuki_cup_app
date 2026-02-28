module Scoreboard
  class SseSubscriptions
    # @rbs queue: Thread::Queue
    def initialize(queue)
      @queue = queue
      @subscribers = []
    end

    # 全イベントを購読する。多重購読ガード付き（2回目以降は何もしない）。
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

      # タイマー
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.timer_init") do |*, payload|
        @queue.push({ event: "timer_init", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.timer_set_remaining_time") do |*, payload|
        @queue.push({ event: "timer_set_remaining_time", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.timer_start") do |*|
        @queue.push({ event: "timer_start", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.timer_stop") do |*|
        @queue.push({ event: "timer_stop", data: {} })
      end

      # 1位発表
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.first_place_init") do |*|
        @queue.push({ event: "first_place_init", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.first_place_prepare_plate") do |*|
        @queue.push({ event: "first_place_prepare_plate", data: {} })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.first_place_display_player") do |*, payload|
        @queue.push({ event: "first_place_display_player", data: payload[:payload] })
      end

      # シード発表
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.paper_seed_init") do |*, payload|
        @queue.push({ event: "paper_seed_init", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.paper_seed_display_player") do |*, payload|
        @queue.push({ event: "paper_seed_display_player", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.paper_seed_exit_all_players") do |*|
        @queue.push({ event: "paper_seed_exit_all_players", data: {} })
      end

      # 2R発表
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.round2_announcement_init") do |*, payload|
        @queue.push({ event: "round2_announcement_init", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.round2_announcement_display_player") do |*, payload|
        @queue.push({ event: "round2_announcement_display_player", data: payload[:payload] })
      end
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.round2_announcement_display_all_players") do |*, payload|
        @queue.push({ event: "round2_announcement_display_all_players", data: payload[:payload] })
      end

      # アナウンス
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.announcement") do |*, payload|
        @queue.push({ event: "announcement", data: payload[:payload] })
      end

      # チャンピオン
      @subscribers << ActiveSupport::Notifications.subscribe("scoreboard.champion") do |*, payload|
        @queue.push({ event: "champion", data: payload[:payload] })
      end
    end

    def unsubscribe_all
      @subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      @subscribers.clear
    end
  end
end

module Scoreboard
  class SseSubscriptions
    # payload[:payload] を SSE データとして流すイベント
    WITH_PAYLOAD = {
      "scoreboard.update" => "match_update",
      "scoreboard.match_init" => "match_init",
      "scoreboard.question_show" => "question_show",
      "scoreboard.timer_init" => "timer_init",
      "scoreboard.timer_set_remaining_time" => "timer_set_remaining_time",
      "scoreboard.first_place_display_player" => "first_place_display_player",
      "scoreboard.paper_seed_init" => "paper_seed_init",
      "scoreboard.paper_seed_display_player" => "paper_seed_display_player",
      "scoreboard.round2_announcement_init" => "round2_announcement_init",
      "scoreboard.round2_announcement_display_player" => "round2_announcement_display_player",
      "scoreboard.round2_announcement_display_all_players" => "round2_announcement_display_all_players",
      "scoreboard.announcement" => "announcement",
      "scoreboard.champion" => "champion",
    }.freeze

    # payload なし（空ハッシュを送信）のイベント
    WITHOUT_PAYLOAD = {
      "scoreboard.show_scores" => "show_scores",
      "scoreboard.hide_scores" => "hide_scores",
      "scoreboard.question_clear" => "question_clear",
      "scoreboard.timer_start" => "timer_start",
      "scoreboard.timer_stop" => "timer_stop",
      "scoreboard.first_place_init" => "first_place_init",
      "scoreboard.first_place_prepare_plate" => "first_place_prepare_plate",
      "scoreboard.paper_seed_exit_all_players" => "paper_seed_exit_all_players",
    }.freeze

    # @rbs queue: Thread::Queue
    def initialize(queue)
      @queue = queue
      @subscribers = []
    end

    # 全イベントを購読する。多重購読ガード付き（2回目以降は何もしない）。
    def subscribe_all
      return if @subscribers.any?

      WITH_PAYLOAD.each do |notification_name, event_name|
        @subscribers << ActiveSupport::Notifications.subscribe(notification_name) do |*, payload|
          @queue.push({ event: event_name, data: payload[:payload] })
        end
      end

      WITHOUT_PAYLOAD.each do |notification_name, event_name|
        @subscribers << ActiveSupport::Notifications.subscribe(notification_name) do |*|
          @queue.push({ event: event_name, data: {} })
        end
      end
    end

    def unsubscribe_all
      @subscribers.each { |sub| ActiveSupport::Notifications.unsubscribe(sub) }
      @subscribers.clear
    end
  end
end

# Turbo::Streams::TagBuilder の独自アクションの定義。
# 詳しくは Turbo::Streams::TagBuilder を参照。
ActiveSupport.on_load(:turbo_streams_tag_builder) do
  def timer_start
    action "timer-start", nil
  end

  def timer_stop
    action "timer-stop", nil
  end

  def timer_set_remaining_time(remaining_time)
    turbo_stream_action_tag "timer-set-remaining-time", "remaining-time": remaining_time
  end
end

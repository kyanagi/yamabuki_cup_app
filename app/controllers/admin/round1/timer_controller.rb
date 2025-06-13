module Admin
  module Round1
    class TimerController < AdminController
      layout false

      def show
        render :show, layout: "admin"
      end

      def display
        ActionCable.server.broadcast("scoreboard", render_to_string("scoreboard/timer"))
      end

      def start
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_start)
      end

      def stop
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_stop)
      end

      def update_remaining_time
        remaining_time = ((params[:minutes].to_i * 60) + params[:seconds].to_i) * 1000
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_set_remaining_time(remaining_time))
      end
    end
  end
end

module Admin
  module Round1
    class TimerController < AdminController
      layout false

      def show
      end

      def display
        ActionCable.server.broadcast("scoreboard", render_to_string("scoreboard/timer"))
      end

      def start
        ActionCable.server.broadcast("scoreboard", '<turbo-stream action="timer-start"></turbo-stream>')
      end

      def stop
        ActionCable.server.broadcast("scoreboard", '<turbo-stream action="timer-stop"></turbo-stream>')
      end

      def update_remaining_time
        remaining_time = ((params[:minutes].to_i * 60) + params[:seconds].to_i) * 1000
        ActionCable.server.broadcast("scoreboard", <<~TEMPLATE)
          <turbo-stream action="timer-set-remaining-time" remaining-time="#{remaining_time}"></turbo-stream>
        TEMPLATE
      end
    end
  end
end

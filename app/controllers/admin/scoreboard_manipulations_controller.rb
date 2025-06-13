module Admin
  class ScoreboardManipulationsController < AdminController
    layout false

    def new
      render :new, layout: "admin"
    end

    def create
      case params[:action_name]
      when "paper_top_init"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-root") { render_to_string("scoreboard/paper_top/_init") }
        )
      end

      head :no_content
    end
  end
end

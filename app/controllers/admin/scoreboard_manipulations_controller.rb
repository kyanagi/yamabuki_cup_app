module Admin
  class ScoreboardManipulationsController < AdminController
    layout false

    def new
      render :new, layout: "admin"
    end

    def create
      case params[:action_name]
      when "paper_seed_init"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { render_to_string("scoreboard/paper_seed/_init") }
        )
      when "paper_seed_display_player"
        ActionCable.server.broadcast(
          "scoreboard",
          render_to_string("scoreboard/paper_seed/_display_player", locals: { rank: params[:rank].to_i })
        )
      end

      head :no_content
    end
  end
end

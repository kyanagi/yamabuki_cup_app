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
      when "round2_init"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { render_to_string("scoreboard/round2/_init") }
        )
      when "round2_display_player"
        player_id = params[:rank].to_i # TODO
        ActionCable.server.broadcast(
          "scoreboard",
          render_to_string("scoreboard/round2/_display_player", locals: { id: player_id })
        )
      end

      head 204
    end
  end
end

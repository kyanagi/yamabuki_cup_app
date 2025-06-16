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
        ranks = Match.find(params[:match_id]).matchings.order(:seat).map { it.player.yontaku_player_result.rank }
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { render_to_string("scoreboard/round2_announcement/_init", locals: { ranks: }) }
        )
      when "round2_display_player"
        matching = Matching.find(params[:matching_id])
        player = matching.player
        rank = player.yontaku_player_result.rank
        ActionCable.server.broadcast(
          "scoreboard",
          render_to_string("scoreboard/round2_announcement/_display_player", locals: { rank:, player: })
        )
      when "match_display"
        match = Match.find(params[:match_id])
        scores = match.current_scores.sort_by { it.matching.seat }
        score_operation = match.last_score_operation
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") do
            render_to_string(
              "scoreboard/#{match.rule_class::ADMIN_VIEW_TEMPLATE}/_init",
              locals: { scores:, score_operation: }
            )
          end + turbo_stream.update("scoreboard-footer-left") { "#{match.round.name} #{match.name}" }
        )
      end

      head 204
    end
  end
end

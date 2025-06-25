module Admin
  class ScoreboardManipulationsController < AdminController
    layout false

    def new
      redirect_to round1_timer_admin_scoreboard_manipulations_path
    end

    def round1_timer
      @section = "round1_timer"
      render :show, layout: "admin"
    end

    def seed_announcement
      @section = "seed_announcement"
      @yontaku_results = YontakuPlayerResult.includes(player: :player_profile).order(:rank)
      render :show, layout: "admin"
    end

    def round2_match1
      @section = "round2_match1"
      @match = Round::ROUND2.matches[0]
      render :show, layout: "admin"
    end

    def round2_match2
      @section = "round2_match2"
      @match = Round::ROUND2.matches[1]
      render :show, layout: "admin"
    end

    def round2_match3
      @section = "round2_match3"
      @match = Round::ROUND2.matches[2]
      render :show, layout: "admin"
    end

    def round2_match4
      @section = "round2_match4"
      @match = Round::ROUND2.matches[3]
      render :show, layout: "admin"
    end

    def round2_match5
      @section = "round2_match5"
      @match = Round::ROUND2.matches[4]
      render :show, layout: "admin"
    end

    def announcement
      @section = "announcement"
      render :show, layout: "admin"
    end

    def create
      case params[:action_name]
      when "round1_timer_init"
        ActionCable.server.broadcast("scoreboard", render_to_string("scoreboard/timer"))
      when "round1_timer_update_remaining_time"
        remaining_time = ((params[:minutes].to_i * 60) + params[:seconds].to_i) * 1000
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_set_remaining_time(remaining_time))
      when "round1_timer_start"
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_start)
      when "round1_timer_stop"
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_stop)
      when "paper_seed_init"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { render_to_string("scoreboard/paper_seed/_init") } +
          turbo_stream.update("scoreboard-footer-left") { Round::ROUND1.name }
        )
      when "paper_seed_display_player"
        yontaku_player_result = YontakuPlayerResult.find_by(rank: params[:rank])
        ActionCable.server.broadcast(
          "scoreboard",
          render_to_string(
            "scoreboard/paper_seed/_display_player",
            locals: { yontaku_player_result: }
          )
        )
      when "round2_init"
        match = Match.find(params[:match_id])
        ranks = match.matchings.order(:seat).map { it.player.yontaku_player_result.rank }
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") do
            render_to_string("scoreboard/round2_announcement/_init", locals: { ranks: })
          end + turbo_stream.update("scoreboard-footer-left") do
            "#{match.round.name} #{match.name}"
          end
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
      when "show_scores"
        ActionCable.server.broadcast(
          "scoreboard",
          "<turbo-stream action='show-scores'></turbo-stream>"
        )
      when "hide_scores"
        ActionCable.server.broadcast(
          "scoreboard",
          "<turbo-stream action='hide-scores'></turbo-stream>"
        )
      when "announcement_display"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") do
            render_to_string("scoreboard/announcement/_display", locals: { text: params[:announcement_text] })
          end + turbo_stream.update("scoreboard-footer-left") { "" }
        )
      end

      head 204
    end
  end
end

module Admin
  class ScoreboardManipulationsController < AdminController
    layout false

    def new
      redirect_to round1_timer_admin_scoreboard_manipulations_path
    end

    def round1_timer
      @section = "round1_timer"
      render_show
    end

    def first_place_announcement
      @section = "first_place_announcement"
      @first_place_result = YontakuPlayerResult.includes(player: :player_profile).find_by(rank: 1)
      render_show
    end

    def seed_announcement
      @section = "seed_announcement"
      @yontaku_results = YontakuPlayerResult.includes(player: :player_profile).order(:rank)
      render_show
    end

    def round2_match
      @section = "round2_match"
      @match = find_match_or_default(Round::ROUND2, params[:match_id])
      render_show
    end

    def playoff_match
      @section = "playoff_match"
      @match = find_match_or_default(Round::PLAYOFF, params[:match_id])
      render_show
    end

    def announcement
      @section = "announcement"
      render_show
    end

    def create
      case params[:action_name]
      when "round1_timer_init"
        ActionCable.server.broadcast("scoreboard", render_to_string("scoreboard/timer"))
        ActiveSupport::Notifications.instrument("scoreboard.timer_init", payload: { footerLabel: Round::ROUND1.name })
      when "round1_timer_init_with_time"
        remaining_time = ((params[:minutes].to_i * 60) + params[:seconds].to_i) * 1000
        ActionCable.server.broadcast("scoreboard", render_to_string("scoreboard/timer"))
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_set_remaining_time(remaining_time))
        ActiveSupport::Notifications.instrument("scoreboard.timer_init", payload: { footerLabel: Round::ROUND1.name })
        ActiveSupport::Notifications.instrument("scoreboard.timer_set_remaining_time", payload: { remainingTimeMs: remaining_time })
      when "round1_timer_update_remaining_time"
        remaining_time = ((params[:minutes].to_i * 60) + params[:seconds].to_i) * 1000
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_set_remaining_time(remaining_time))
        ActiveSupport::Notifications.instrument("scoreboard.timer_set_remaining_time", payload: { remainingTimeMs: remaining_time })
      when "round1_timer_start"
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_start)
        ActiveSupport::Notifications.instrument("scoreboard.timer_start")
      when "round1_timer_stop"
        ActionCable.server.broadcast("scoreboard", turbo_stream.timer_stop)
        ActiveSupport::Notifications.instrument("scoreboard.timer_stop")
      when "first_place_init"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { "" } +
          turbo_stream.update("scoreboard-footer-left") { "1位発表" }
        )
        ActiveSupport::Notifications.instrument("scoreboard.first_place_init")
      when "first_place_prepare_plate"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { render_to_string("scoreboard/first_place/_init") } +
          turbo_stream.update("scoreboard-footer-left") { "1位発表" }
        )
        ActiveSupport::Notifications.instrument("scoreboard.first_place_prepare_plate")
      when "first_place_display_player"
        yontaku_player_result = YontakuPlayerResult.find_by(rank: 1)
        ActionCable.server.broadcast(
          "scoreboard",
          render_to_string(
            "scoreboard/first_place/_display_player",
            locals: { yontaku_player_result: }
          )
        )
        player_name = yontaku_player_result.player.player_profile.scoreboard_full_name
        ActiveSupport::Notifications.instrument("scoreboard.first_place_display_player", payload: { playerName: player_name })
      when "paper_seed_init"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") { render_to_string("scoreboard/paper_seed/_init") } +
          turbo_stream.update("scoreboard-footer-left") { Round::ROUND1.name }
        )
        ActiveSupport::Notifications.instrument("scoreboard.paper_seed_init", payload: { footerLabel: Round::ROUND1.name })
      when "paper_seed_display_player"
        yontaku_player_result = YontakuPlayerResult.find_by(rank: params[:rank])
        ActionCable.server.broadcast(
          "scoreboard",
          render_to_string(
            "scoreboard/paper_seed/_display_player",
            locals: { yontaku_player_result: }
          )
        )
        ActiveSupport::Notifications.instrument("scoreboard.paper_seed_display_player", payload: {
          rank: yontaku_player_result.rank,
          name: yontaku_player_result.player.player_profile.scoreboard_full_name,
          score: yontaku_player_result.score,
        })
      when "paper_seed_exit_all_players"
        ActionCable.server.broadcast(
          "scoreboard",
          "<turbo-stream action='exit_paper_seed_plates' target='scoreboard-main'></turbo-stream>"
        )
        ActiveSupport::Notifications.instrument("scoreboard.paper_seed_exit_all_players")
      when "round2_init"
        match = Match.find(params[:match_id])
        ActionCable.server.broadcast("scoreboard", round2_announcement_init_stream(match))
        grid_class = match.rule_class == MatchRule::Round2Ura ? "match-scorelist-column2-row6" : "match-scorelist-column2-row5"
        players = match.matchings.order(:seat).map { |m| { rank: m.player.yontaku_player_result.rank } }
        ActiveSupport::Notifications.instrument("scoreboard.round2_announcement_init", payload: {
          footerLabel: "#{match.round.name} #{match.name}",
          gridClass: grid_class,
          players: players,
        })
      when "round2_display_player"
        matching = Matching.find(params[:matching_id])
        ActionCable.server.broadcast(
          "scoreboard",
          render_round2_announcement_player_stream(matching)
        )
        rank = matching.player.yontaku_player_result.rank
        name = matching.player.player_profile.scoreboard_full_name
        ActiveSupport::Notifications.instrument("scoreboard.round2_announcement_display_player", payload: { rank: rank, name: name })
      when "round2_display_all_players"
        match = Match.find(params[:match_id])
        full_stream = +round2_announcement_init_stream(match).to_s
        match.matchings.order(:seat).each do |matching|
          full_stream << render_round2_announcement_player_stream(matching, staggered: true)
        end
        ActionCable.server.broadcast(
          "scoreboard",
          full_stream
        )
        grid_class = match.rule_class == MatchRule::Round2Ura ? "match-scorelist-column2-row6" : "match-scorelist-column2-row5"
        players = match.matchings.order(:seat).map do |m|
          { rank: m.player.yontaku_player_result.rank, name: m.player.player_profile.scoreboard_full_name }
        end
        ActiveSupport::Notifications.instrument("scoreboard.round2_announcement_display_all_players", payload: {
          footerLabel: "#{match.round.name} #{match.name}",
          gridClass: grid_class,
          players: players,
        })
      when "match_display"
        match = Match.find(params[:match_id])

        if match.rule_class == MatchRule::Round2Ura
          return head :unprocessable_entity
        end

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
        json = Scoreboard::MatchSerializer.new(match, scores, score_operation).as_json
        ActiveSupport::Notifications.instrument("scoreboard.match_init", payload: json)
      when "final_display_champion"
        match = Match.find(params[:match_id])
        return head :unprocessable_entity unless match.rule_class == MatchRule::Final

        champion_name = final_champion_name(match)
        return head :unprocessable_entity unless champion_name

        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") do
            render_to_string("scoreboard/final/_champion", locals: { champion_name: })
          end
        )
        ActiveSupport::Notifications.instrument("scoreboard.champion", payload: {
          name: champion_name,
          tournamentName: "第2回やまぶき杯",
        })
      when "show_scores"
        ActionCable.server.broadcast(
          "scoreboard",
          "<turbo-stream action='show-scores'></turbo-stream>"
        )
        ActiveSupport::Notifications.instrument("scoreboard.show_scores")
      when "hide_scores"
        ActionCable.server.broadcast(
          "scoreboard",
          "<turbo-stream action='hide-scores'></turbo-stream>"
        )
        ActiveSupport::Notifications.instrument("scoreboard.hide_scores")
      when "announcement_display"
        ActionCable.server.broadcast(
          "scoreboard",
          turbo_stream.update("scoreboard-main") do
            render_to_string("scoreboard/announcement/_display", locals: { text: params[:announcement_text] })
          end + turbo_stream.update("scoreboard-footer-left") { "" }
        )
        ActiveSupport::Notifications.instrument("scoreboard.announcement", payload: { text: params[:announcement_text] })
      end

      head 204
    end

    private

    # @rbs round: Round
    # @rbs match_id: String?
    # @rbs return: Match?
    def find_match_or_default(round, match_id)
      matches = round.matches.order(:match_number)
      return matches.first if match_id.blank?

      matches.find { it.id == match_id.to_i } || matches.first
    end

    # @rbs match: Match
    # @rbs return: String
    def round2_announcement_init_stream(match)
      dir = round2_template_dir(match)
      ranks = match.matchings.order(:seat).map { it.player.yontaku_player_result.rank }
      turbo_stream.update("scoreboard-main") do
        render_to_string("#{dir}/_init", locals: { ranks: })
      end + turbo_stream.update("scoreboard-footer-left") do
        "#{match.round.name} #{match.name}"
      end
    end

    # @rbs matching: Matching
    # @rbs staggered: bool
    # @rbs return: String
    def render_round2_announcement_player_stream(matching, staggered: false)
      dir = round2_template_dir(matching.match)
      player = matching.player
      rank = player.yontaku_player_result.rank
      partial = if staggered
                  "#{dir}/_display_player_staggered"
                else
                  "#{dir}/_display_player"
                end
      render_to_string(partial, locals: { rank:, player: })
    end

    def round2_template_dir(match)
      if match.rule_class == MatchRule::Round2Ura
        "scoreboard/round2ura_announcement"
      else
        "scoreboard/round2omote_announcement"
      end
    end

    def render_show #: void
      @round2_matches = Round::ROUND2.matches.order(:match_number)
      @playoff_matches = Round::PLAYOFF.matches.order(:match_number)
      render :show, layout: "admin"
    end

    def final_champion_name(match)
      champion_score = match.current_scores.find_by(rank: 1)
      champion_score&.matching&.player&.player_profile&.scoreboard_full_name
    end
  end
end

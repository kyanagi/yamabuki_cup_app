require "rails_helper"

RSpec.describe "Admin::ScoreboardManipulations", type: :request do
  def create_match_with_ranked_players(rule_name:, round_id:, player_count:, start_rank: 1)
    match = create(:match, rule_name:, round_id:)
    player_count.times.map do |i|
      rank = start_rank + i
      player = create(:player)
      create(:player_profile, player:, family_name: "姓#{rank}", given_name: "名", family_name_kana: "せい", given_name_kana: "めい")
      create(:yontaku_player_result, player:, rank:, score: 100 - rank)
      create(:matching, match:, player:, seat: i)
    end
    match
  end

  def login_as_admin
    admin_user = create(:admin_user, role: :admin)
    post admin_session_path, params: { username: admin_user.username, password: "password123" }
  end

  before { login_as_admin }

  describe "POST /admin/scoreboard_manipulations（match_display）" do
    context "2R裏の試合の場合" do
      it "422が返される" do
        match = create(:match, rule_name: "MatchRule::Round2Ura")

        post admin_scoreboard_manipulations_path,
             params: { action_name: "match_display", match_id: match.id }

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context "2R表の試合の場合" do
      it "204が返される" do
        match = create(:match, rule_name: "MatchRule::Round2Omote")
        10.times.map do |i|
          player = create(:player)
          create(:player_profile, player: player)
          create(:matching, match: match, player: player, seat: i + 1)
        end
        MatchOpening.create!(match: match)

        post admin_scoreboard_manipulations_path,
             params: { action_name: "match_display", match_id: match.id }

        expect(response).to have_http_status(:no_content)
      end
    end
  end

  describe "POST /admin/scoreboard_manipulations（round2_display_all_players）" do
    [
      { rule_name: "MatchRule::Round2Omote", round_id: Round::ROUND2.id, player_count: 10, start_rank: 8 },
      { rule_name: "MatchRule::Round2Ura", round_id: Round::ROUND2.id, player_count: 10, start_rank: 58 },
      { rule_name: "MatchRule::Playoff", round_id: Round::PLAYOFF.id, player_count: 10, start_rank: 8 },
    ].each do |scenario|
      context "#{scenario[:rule_name]} の場合" do
        it "204を返し、初期化後に全員分の時間差表示をbroadcastする" do
          match = create_match_with_ranked_players(**scenario)

          expected_rank_and_names = match.matchings.order(:seat).map do |matching|
            rank = matching.player.yontaku_player_result.rank
            [rank, matching.player.player_profile.scoreboard_full_name]
          end

          expect do
            post admin_scoreboard_manipulations_path,
                 params: { action_name: "round2_display_all_players", match_id: match.id }
          end.to(have_broadcasted_to("scoreboard").with do |data|
            expect(data).to include('action="update" target="scoreboard-main"')
            expect(data).to include('action="update" target="scoreboard-footer-left"')
            expect(data).to include("player-frame--incoming-animation")

            expected_rank_and_names.each do |rank, name|
              expect(data).to include(%Q(action="replace" target="round2-player-#{rank}"))
              expect(data).to include(name)
            end
          end)

          expect(response).to have_http_status(:no_content)
        end
      end
    end
  end

  describe "GET /admin/scoreboard_manipulations（発表操作画面）" do
    it "2R発表画面に一括表示ボタンと個別表示ボタンが表示される" do
      match = create_match_with_ranked_players(
        rule_name: "MatchRule::Round2Omote",
        round_id: Round::ROUND2.id,
        player_count: 10,
        start_rank: 8
      )

      get round2_match_admin_scoreboard_manipulations_path(match_id: match.id)

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("一括表示")
      expect(response.body).to include("初期表示")
      expect(response.body).to include("round2_display_player")
      expect(response.body).to include("round2_display_all_players")
    end

    it "プレーオフ発表画面に一括表示ボタンと個別表示ボタンが表示される" do
      match = create_match_with_ranked_players(
        rule_name: "MatchRule::Playoff",
        round_id: Round::PLAYOFF.id,
        player_count: 10,
        start_rank: 8
      )

      get playoff_match_admin_scoreboard_manipulations_path(match_id: match.id)

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("一括表示")
      expect(response.body).to include("初期表示")
      expect(response.body).to include("round2_display_player")
      expect(response.body).to include("round2_display_all_players")
    end
  end
end

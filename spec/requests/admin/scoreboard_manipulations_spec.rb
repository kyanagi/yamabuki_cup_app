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

        expect(response).to have_http_status(:unprocessable_content)
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

  describe "POST /admin/scoreboard_manipulations（final_display_champion）" do
    def create_final_match_with_players
      match = create(:match, rule_name: "MatchRule::Final", round_id: Round::FINAL.id)
      MatchRule::Final::NUM_SEATS.times do |i|
        player = create(:player)
        create(
          :player_profile,
          player:,
          family_name: "姓#{i + 1}",
          given_name: "名",
          family_name_kana: "せい",
          given_name_kana: "めい"
        )
        create(:matching, match:, player:, seat: i + 1)
      end
      MatchOpening.create!(match:)
      match.reload
    end

    context "決勝で優勝者が確定している場合" do
      it "204を返し、CHAMPION表示をbroadcastする" do
        match = create_final_match_with_players
        winner_matching = match.matchings.order(:seat).first
        winner_score = match.last_score_operation.scores.find_by!(matching: winner_matching)
        winner_score.update!(status: "win", rank: 1)

        expected_name = winner_matching.player.player_profile.scoreboard_full_name

        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "final_display_champion", match_id: match.id }
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include('action="update" target="scoreboard-main"')
          expect(data).to include("第2回やまぶき杯")
          expect(data).to include("CHAMPION")
          expect(data).to include(expected_name)
        end)

        expect(response).to have_http_status(:no_content)
      end
    end

    context "決勝で優勝者が未確定の場合" do
      it "422を返し、broadcastを行わない" do
        match = create_final_match_with_players

        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "final_display_champion", match_id: match.id }
        end.not_to have_broadcasted_to("scoreboard")

        expect(response).to have_http_status(:unprocessable_content)
      end
    end

    context "決勝以外の試合の場合" do
      it "422を返し、broadcastを行わない" do
        match = create(:match, rule_name: "MatchRule::Round2Omote", round_id: Round::ROUND2.id)

        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "final_display_champion", match_id: match.id }
        end.not_to have_broadcasted_to("scoreboard")

        expect(response).to have_http_status(:unprocessable_content)
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

            rank_texts = data.scan(%r{<div class="player__rank">([^<]+)</div>}).flatten
            if scenario[:rule_name] == "MatchRule::Round2Ura"
              expect(rank_texts).not_to be_empty
              expect(rank_texts.uniq).to eq(["-"])
            else
              expected_rank_and_names.each do |(rank, _)|
                expect(rank_texts).to include(rank.to_s)
              end
            end
          end)

          expect(response).to have_http_status(:no_content)
        end
      end
    end
  end

  describe "POST /admin/scoreboard_manipulations（1位発表）" do
    let!(:player) { create(:player) }
    let!(:player_profile) do
      create(
        :player_profile,
        player:,
        family_name: "山田",
        given_name: "花子",
        family_name_kana: "やまだ",
        given_name_kana: "はなこ"
      )
    end
    let!(:first_place_result) { create(:yontaku_player_result, player:, rank: 1, score: 77) }

    describe "first_place_init" do
      it "204を返し、プレートを表示しない初期表示をbroadcastする" do
        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "first_place_init" }
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include('action="update" target="scoreboard-main"')
          expect(data).to include('action="update" target="scoreboard-footer-left"')
          expect(data).not_to include("first-place-player")
        end)

        expect(response).to have_http_status(:no_content)
      end
    end

    describe "first_place_prepare_plate" do
      it "204を返し、順位のみのプレート表示をbroadcastする" do
        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "first_place_prepare_plate" }
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include('action="update" target="scoreboard-main"')
          expect(data).to include("first-place-player")
          expect(data).to include("first-place-plate--drop-in-animation")
        end)

        expect(response).to have_http_status(:no_content)
      end
    end

    describe "first_place_display_player" do
      it "204を返し、1位の名前入りプレート差し替えをbroadcastする" do
        expected_name = player_profile.scoreboard_full_name

        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "first_place_display_player" }
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include('action="replace" target="first-place-player"')
          expect(data).to include(expected_name)
          expect(data).to include("animation-flip-in-x")
        end)

        expect(response).to have_http_status(:no_content)
      end
    end
  end

  describe "POST /admin/scoreboard_manipulations（シード発表）" do
    describe "paper_seed_exit_all_players" do
      it "204を返し、全プレートを消去するbroadcastを行う" do
        expect do
          post admin_scoreboard_manipulations_path,
               params: { action_name: "paper_seed_exit_all_players" }
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include("action='exit_paper_seed_plates' target='scoreboard-main'")
        end)

        expect(response).to have_http_status(:no_content)
      end
    end
  end

  describe "GET /admin/scoreboard_manipulations（発表操作画面）" do
    it "1位発表画面に初期表示・プレート準備・1位を表示ボタンが表示される" do
      player = create(:player)
      create(
        :player_profile,
        player:,
        family_name: "山田",
        given_name: "太郎",
        family_name_kana: "やまだ",
        given_name_kana: "たろう"
      )
      create(:yontaku_player_result, player:, rank: 1, score: 80)

      get first_place_announcement_admin_scoreboard_manipulations_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("初期表示")
      expect(response.body).to include("プレート準備")
      expect(response.body).to include("1位を表示")
      expect(response.body).to include("first_place_init")
      expect(response.body).to include("first_place_prepare_plate")
      expect(response.body).to include("first_place_display_player")
    end

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

    it "シード発表画面にプレート退出ボタンが表示される" do
      player = create(:player)
      create(
        :player_profile,
        player:,
        family_name: "佐藤",
        given_name: "次郎",
        family_name_kana: "さとう",
        given_name_kana: "じろう"
      )
      create(:yontaku_player_result, player:, rank: 1, score: 79)

      get seed_announcement_admin_scoreboard_manipulations_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("プレート退出")
      expect(response.body).to include("paper_seed_exit_all_players")
    end
  end
end

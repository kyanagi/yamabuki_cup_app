require "rails_helper"

RSpec.describe "Admin::ScoreboardManipulations", type: :request do
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
end

require "rails_helper"

RSpec.describe "Admin::Matches", type: :request do
  def login_as_admin
    admin_user = create(:admin_user, role: :admin)
    post admin_session_path, params: { username: admin_user.username, password: "password123" }
  end

  def create_match_with_opening(rule_name:)
    match = create(:match, rule_name: rule_name)
    rule_class = rule_name.constantize
    rule_class::NUM_SEATS.times do |i|
      matching = create(:matching, match: match, seat: i + 1)
      create(:player_profile, player: matching.player)
    end
    MatchOpening.create!(match: match)
    match.reload
  end

  before { login_as_admin }

  describe "GET /admin/matches/:id" do
    [
      "MatchRule::Round2Omote",
      "MatchRule::Round3Hayaoshi71",
      "MatchRule::Round3Hayaoshi73",
      "MatchRule::Quarterfinal",
      "MatchRule::Round3Hayabo",
      "MatchRule::Round3Hayabo2",
      "MatchRule::Semifinal",
      "MatchRule::Playoff",
      "MatchRule::Final",
    ].each do |rule_name|
      it "#{rule_name} では自由編集リンクが表示される" do
        match = create_match_with_opening(rule_name: rule_name)

        get admin_match_path(match)

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("自由編集")
      end
    end

    it "2R裏では自由編集リンクが表示されない" do
      match = create_match_with_opening(rule_name: "MatchRule::Round2Ura")

      get admin_match_path(match)

      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("自由編集")
      expect(response.body).to include("勝抜け者入力フォーム")
    end
  end
end

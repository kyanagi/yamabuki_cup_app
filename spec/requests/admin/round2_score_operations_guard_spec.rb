require "rails_helper"

RSpec.describe "Admin 2R裏スコア操作ガード", type: :request do
  def create_round2_ura_match_with_participants(count: 12)
    match = create(:match, rule_name: "MatchRule::Round2Ura")
    count.times.map do |i|
      create(:matching, match: match, seat: i + 1)
    end
    MatchOpening.create!(match: match)
    match.reload
  end

  def login_as_admin
    admin_user = create(:admin_user, role: :admin)
    post admin_session_path, params: { username: admin_user.username, password: "password123" }
  end

  before { login_as_admin }

  describe "POST /admin/matches/:match_id/question_closings（2R裏）" do
    it "422が返される" do
      match = create_round2_ura_match_with_participants
      post admin_match_question_closings_path(match_id: match.id)
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "ScoreOperationが作成されない" do
      match = create_round2_ura_match_with_participants
      initial_count = ScoreOperation.count
      post admin_match_question_closings_path(match_id: match.id)
      expect(ScoreOperation.count).to eq(initial_count)
    end
  end

  describe "POST /admin/matches/:match_id/match_closings（2R裏）" do
    it "422が返される" do
      match = create_round2_ura_match_with_participants
      post admin_match_match_closings_path(match_id: match.id)
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "ScoreOperationが作成されない" do
      match = create_round2_ura_match_with_participants
      initial_count = ScoreOperation.count
      post admin_match_match_closings_path(match_id: match.id)
      expect(ScoreOperation.count).to eq(initial_count)
    end
  end
end

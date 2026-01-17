require "rails_helper"

RSpec.describe "GET /admin/round1/results", type: :request do
  before do
    sign_in_admin
    player_profiles = create_list(:player_profile, 10)
    player_profiles.first(5).each.with_index(1) do |player_profile, i|
      create(:approximation_quiz_answer, player_id: player_profile.player_id)
      create(:yontaku_player_paper, player_id: player_profile.player_id)
      create(:yontaku_player_result, player_id: player_profile.player_id, rank: i, score: 100 - i)
    end
  end

  it "returns 200" do
    subject
    expect(response).to have_http_status(200)
  end
end

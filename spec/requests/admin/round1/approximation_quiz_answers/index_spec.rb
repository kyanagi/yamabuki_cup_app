require "rails_helper"

RSpec.describe "GET /admin/round1/approximation_quiz_answers", type: :request do
  before do
    sign_in_admin
    player_profiles = create_list(:player_profile, 10)
    player_profiles.first(5).each do |player_profile|
      create(:approximation_quiz_answer, player_id: player_profile.player.id)
    end
  end

  it "returns 200" do
    subject
    expect(response).to have_http_status(200)
  end
end

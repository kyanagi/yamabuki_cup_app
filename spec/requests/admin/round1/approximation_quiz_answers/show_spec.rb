require "rails_helper"

RSpec.describe "GET /admin/round1/approximation_quiz_answers/:id", type: :request do
  before do
    sign_in_admin
  end

  let(:player_profile) { create(:player_profile) }
  let(:player) { player_profile.player }
  let!(:approximation_quiz_answer) { create(:approximation_quiz_answer, player: player, answer1: 100, answer2: 200) }

  it "returns 200 and displays the approximation quiz answer" do
    get admin_round1_approximation_quiz_answer_path(approximation_quiz_answer)

    expect(response).to have_http_status(200)
    expect(response.body).to include(player_profile.full_name)
    expect(response.body).to include("100")
    expect(response.body).to include("200")
  end
end

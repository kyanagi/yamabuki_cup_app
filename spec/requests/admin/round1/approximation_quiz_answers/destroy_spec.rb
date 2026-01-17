require "rails_helper"

RSpec.describe "DELETE /admin/round1/approximation_quiz_answers/:id", type: :request do
  before do
    sign_in_admin
  end

  let(:player_profile) { create(:player_profile) }
  let(:player) { player_profile.player }
  let!(:approximation_quiz_answer) { create(:approximation_quiz_answer, player: player, answer1: 100, answer2: 200) }

  it "deletes the approximation quiz answer and redirects to new page" do
    expect do
      delete admin_round1_approximation_quiz_answer_path(approximation_quiz_answer)
    end.to change(ApproximationQuizAnswer, :count).by(-1)

    expect(response).to redirect_to(new_admin_round1_approximation_quiz_answer_path)
    follow_redirect!
    expect(response.body).to include("ID=#{player.id} の近似値を削除しました。")
  end
end

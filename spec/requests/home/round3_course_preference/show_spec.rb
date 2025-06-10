require "rails_helper"

RSpec.describe "GET /home/round3_course_preference", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }
  let(:session) { create(:session, player:) }
  let(:matches) { create_list(:match, 4, round: Round::ROUND3) }
  let!(:round3_course_preference) do
    create(
      :round3_course_preference,
      player:,
      choice1_match: matches[0],
      choice2_match: matches[1],
      choice3_match: matches[2],
      choice4_match: matches[3]
    )
  end

  context "ログイン時" do
    before do
      post session_path, params: { email: credential.email, password: "password" }
    end

    it "正常にアクセスできること" do
      subject
      expect(response).to have_http_status(:ok)
    end

    it "プレイヤーの3Rコース選択希望が表示されること" do
      subject
      expect(response.body).to include("3Rコース選択希望の変更")
      matches.each do |match|
        expect(response.body).to include(match.name)
      end
    end
  end

  context "未ログインの場合" do
    it "ログインページにリダイレクトされること" do
      subject
      expect(response).to redirect_to(new_session_path)
    end
  end
end

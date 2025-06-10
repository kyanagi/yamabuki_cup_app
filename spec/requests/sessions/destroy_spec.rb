require "rails_helper"

RSpec.describe "DELETE /session", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password123") }

  it "ログアウトし、トップページにリダイレクトされる" do
    post "/session", params: { email: credential.email, password: "password123" }
    expect(cookies[:session_id]).not_to be_blank
    subject
    expect(response).to redirect_to(root_url)
    follow_redirect!
    expect(response.body).to include("not logged in.")
    expect(cookies[:session_id]).to be_blank
  end
end

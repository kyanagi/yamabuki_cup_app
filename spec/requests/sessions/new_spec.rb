require "rails_helper"

RSpec.describe "GET /session/new", type: :request do
  it "ログインページが表示される" do
    subject
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("ログイン")
  end
end

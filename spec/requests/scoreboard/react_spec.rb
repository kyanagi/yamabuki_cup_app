require "rails_helper"

RSpec.describe "Scoreboard::React", type: :request do
  describe "GET /scoreboard/react" do
    it "200レスポンスを返す" do
      get "/scoreboard/react"
      expect(response).to have_http_status(:ok)
    end

    it "scoreboard_reactレイアウトを使用する" do
      get "/scoreboard/react"
      expect(response.body).to include('<div id="react-root">')
    end

    it "scoreboardのCSSを読み込む" do
      get "/scoreboard/react"
      expect(response.body).to include("scoreboard")
    end
  end
end

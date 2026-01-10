require "rails_helper"

RSpec.describe "Admin::Round1::Players", type: :request do
  describe "GET /admin/round1/players/:id" do
    context "存在するプレイヤーの場合" do
      let(:player_profile) { create(:player_profile) }
      let(:player) { player_profile.player }

      it "200を返し、氏名をJSONで返す" do
        get admin_round1_player_path(player)
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json["name"]).to eq(player_profile.full_name)
      end
    end

    context "存在しないプレイヤーの場合" do
      it "404を返す" do
        get admin_round1_player_path(99999)
        expect(response).to have_http_status(:not_found)
        json = response.parsed_body
        expect(json["name"]).to be_nil
      end
    end

    context "player_profileがないプレイヤーの場合" do
      let(:player) { create(:player) }

      it "200を返し、nameがnilのJSONを返す" do
        get admin_round1_player_path(player)
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json["name"]).to be_nil
      end
    end
  end
end

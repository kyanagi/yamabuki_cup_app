require "rails_helper"

RSpec.describe "GET /home/player_profile/edit", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }

  before do
    create(:player_profile, player:)
    post session_path, params: { email: credential.email, password: "password" }
  end

  it "キャンセルリンクがフォーム外かつ確認ボタンより下に表示される" do
    create(:entry, player:, status: :pending)

    get edit_home_player_profile_path

    expect(response).to have_http_status(:ok)
    doc = response.parsed_body
    form = doc.at_css("form[action='#{home_player_profile_path}']")
    link = doc.at_css("a[href='#{cancel_home_entry_path}']")

    expect(form).to be_present
    expect(link).to be_present
    expect(form.css("a[href='#{cancel_home_entry_path}']")).to be_empty
    expect(response.body.index("確認する")).to be < response.body.index("エントリーをキャンセルしたい方はこちら")
  end

  it "キャンセル済みの場合はキャンセルリンクを表示しない" do
    create(:entry, player:, status: :cancelled)

    get edit_home_player_profile_path

    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include("エントリーをキャンセルしたい方はこちら")
  end
end

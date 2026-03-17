require "rails_helper"

RSpec.describe "GET /home/player_profile/edit", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }
  let(:player_profile) { create(:player_profile, player:, is_playing_staff_candidate: false) }

  before do
    player_profile
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

  it "当日のお手伝い項目と注意書きを表示し、現在値に応じてチェック状態を反映する" do
    get edit_home_player_profile_path

    expect(response).to have_http_status(:ok)
    doc = response.parsed_body
    checkbox = doc.at_css('input[type="checkbox"][name="player_profile_edit[is_playing_staff_candidate]"]')

    expect(response.body).to include("当日のお手伝い")
    expect(response.body).to include("2Rにおけるホワイトボードでの得点付け")
    expect(checkbox).to be_present
    expect(checkbox["checked"]).to be_nil
  end

  it "PATCH で当日のお手伝い項目を更新できる" do
    patch home_player_profile_path, params: {
      player_profile_edit: {
        email: credential.email,
        password: "",
        family_name: player_profile.family_name,
        given_name: player_profile.given_name,
        family_name_kana: player_profile.family_name_kana,
        given_name_kana: player_profile.given_name_kana,
        entry_list_name: player_profile.entry_list_name,
        is_playing_staff_candidate: "1",
      },
    }

    expect(response).to redirect_to(edit_home_player_profile_path)
    expect(player_profile.reload.is_playing_staff_candidate).to be(true)
  end
end

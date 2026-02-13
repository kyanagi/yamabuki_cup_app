require "rails_helper"

RSpec.describe "PATCH /home/entry/cancel", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }

  before do
    post session_path, params: { email: credential.email, password: "password" }
  end

  context "entry がある場合" do
    it "pending をキャンセルできる" do
      entry = create(:entry, player:, status: :pending)

      patch cancel_home_entry_path

      expect(response).to redirect_to(home_path)
      expect(entry.reload).to be_cancelled
    end

    it "accepted をキャンセルすると waitlisted が繰り上がる" do
      entry = create(:entry, player:, status: :accepted, priority: 10)
      waiting = create(:entry, status: :waitlisted, priority: 11)

      patch cancel_home_entry_path

      expect(response).to redirect_to(home_path)
      expect(entry.reload).to be_cancelled
      expect(waiting.reload).to be_accepted
    end
  end

  context "entry がない場合" do
    it "エラーを表示して home に戻る" do
      patch cancel_home_entry_path

      expect(response).to redirect_to(home_path)
      expect(flash[:alert]).to eq("エントリー情報が見つかりません。")
    end
  end

  context "未ログイン" do
    before do
      delete session_path
    end

    it "ログイン画面へリダイレクトされる" do
      patch cancel_home_entry_path

      expect(response).to redirect_to(new_session_path)
    end
  end
end

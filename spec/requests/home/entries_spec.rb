require "rails_helper"

RSpec.describe "Home::Entries", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }

  before do
    post session_path, params: { email: credential.email, password: "password" }
  end

  describe "GET /home/entry/cancel" do
    context "entry がある場合" do
      it "キャンセルフォームを表示する" do
        create(:entry, player:, status: :pending)

        get cancel_home_entry_path

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("エントリーキャンセル")
      end
    end

    context "entry がない場合" do
      it "エラーを表示して home に戻る" do
        get cancel_home_entry_path

        expect(response).to redirect_to(home_path)
        expect(flash[:alert]).to eq("エントリー情報が見つかりません。")
      end
    end

    context "entry がキャンセル済みの場合" do
      it "エラーを表示して home に戻る" do
        create(:entry, player:, status: :cancelled)

        get cancel_home_entry_path

        expect(response).to redirect_to(home_path)
        expect(flash[:alert]).to eq("既にキャンセル済みです。")
      end
    end

    context "未ログイン" do
      before do
        delete session_path
      end

      it "ログイン画面へリダイレクトされる" do
        get cancel_home_entry_path

        expect(response).to redirect_to(new_session_path)
      end
    end
  end

  describe "PATCH /home/entry/cancel" do
    let(:request_params) do
      { entry_cancellation_form: { confirmation_text: "キャンセル" } }
    end

    context "entry がある場合" do
      it "pending をキャンセルでき、ログアウトされる" do
        entry = create(:entry, player:, status: :pending)
        create(:session, player:)

        patch cancel_home_entry_path, params: request_params

        expect(response).to redirect_to(new_session_path)
        expect(flash[:notice]).to eq("エントリーをキャンセルしました。")
        expect(entry.reload).to be_cancelled
        expect(PlayerEmailCredential.where(player:)).to be_empty
        expect(Session.where(player:)).to be_empty
        expect(cookies[:session_id]).to be_blank
      end

      it "accepted をキャンセルすると waitlisted が繰り上がる" do
        entry = create(:entry, player:, status: :accepted, priority: 10)
        waiting = create(:entry, status: :waitlisted, priority: 11)

        patch cancel_home_entry_path, params: request_params

        expect(response).to redirect_to(new_session_path)
        expect(entry.reload).to be_cancelled
        expect(waiting.reload).to be_accepted
      end

      it "確認テキストが一致しないとキャンセルできない" do
        entry = create(:entry, player:, status: :pending)

        patch cancel_home_entry_path, params: { entry_cancellation_form: { confirmation_text: "キャンセルします" } }

        expect(response).to have_http_status(422)
        expect(entry.reload).to be_pending
        expect(response.body).to include("「キャンセル」と入力してください。")
      end
    end

    context "entry がない場合" do
      it "エラーを表示して home に戻る" do
        patch cancel_home_entry_path, params: request_params

        expect(response).to redirect_to(home_path)
        expect(flash[:alert]).to eq("エントリー情報が見つかりません。")
      end
    end

    context "entry がキャンセル済みの場合" do
      it "エラーを表示して home に戻る" do
        create(:entry, player:, status: :cancelled)

        patch cancel_home_entry_path, params: request_params

        expect(response).to redirect_to(home_path)
        expect(flash[:alert]).to eq("既にキャンセル済みです。")
      end
    end

    context "未ログイン" do
      before do
        delete session_path
      end

      it "ログイン画面へリダイレクトされる" do
        patch cancel_home_entry_path, params: request_params

        expect(response).to redirect_to(new_session_path)
      end
    end
  end
end

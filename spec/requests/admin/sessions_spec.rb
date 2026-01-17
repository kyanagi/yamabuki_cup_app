require "rails_helper"

RSpec.describe "Admin Sessions", type: :request do
  describe "GET /admin/session/new" do
    it "ログインページが表示される" do
      get new_admin_session_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("管理者ログイン")
    end
  end

  describe "POST /admin/session" do
    let!(:admin_user) { create(:admin_user, username: "admin", password: "password123") }

    context "正しいusernameとpasswordの場合" do
      it "ログインに成功し、管理者ダッシュボードにリダイレクトされる" do
        post admin_session_path, params: { username: "admin", password: "password123" }
        expect(response).to redirect_to(admin_root_path)
      end

      it "新規セッションが発行される" do
        expect do
          post admin_session_path, params: { username: "admin", password: "password123" }
        end.to change(AdminSession, :count).by(1)
      end
    end

    context "usernameが間違っている場合" do
      it "ログインに失敗し、エラーメッセージが表示される" do
        post admin_session_path, params: { username: "wrong", password: "password123" }
        expect(response).to have_http_status(422)
        expect(response.body).to include("ユーザー名またはパスワードが正しくありません")
      end
    end

    context "passwordが間違っている場合" do
      it "ログインに失敗し、エラーメッセージが表示される" do
        post admin_session_path, params: { username: "admin", password: "wrong" }
        expect(response).to have_http_status(422)
        expect(response.body).to include("ユーザー名またはパスワードが正しくありません")
      end
    end
  end

  describe "DELETE /admin/session" do
    let!(:admin_user) { create(:admin_user, username: "admin", password: "password123") }

    context "ログイン済みの場合" do
      before do
        post admin_session_path, params: { username: "admin", password: "password123" }
      end

      it "ログアウトし、ログインページにリダイレクトされる" do
        delete admin_session_path
        expect(response).to redirect_to(new_admin_session_path)
      end

      it "セッションが削除される" do
        expect do
          delete admin_session_path
        end.to change(AdminSession, :count).by(-1)
      end
    end
  end
end

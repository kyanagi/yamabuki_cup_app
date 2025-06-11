require "rails_helper"

RSpec.describe "POST /session", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password123") }

  context "メールアドレスとパスワードが正しい場合" do
    before do
      params[:email] = credential.email
      params[:password] = "password123"
    end

    it "ログインに成功し、リダイレクトされる" do
      subject
      expect(response).to redirect_to("http://www.example.com/home")
    end
  end

  context "メールアドレスが間違っている場合" do
    before do
      params[:email] = "wrong@example.com"
      params[:password] = credential.password
    end

    it "ログインに失敗し、エラーメッセージが表示される" do
      subject
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("メールアドレスまたはパスワードが正しくありません。")
    end
  end

  context "パスワードが間違っている場合" do
    before do
      params[:email] = credential.email
      params[:password] = "wrong_password"
    end

    it "ログインに失敗し、エラーメッセージが表示される" do
      subject
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.body).to include("メールアドレスまたはパスワードが正しくありません。")
    end
  end
end

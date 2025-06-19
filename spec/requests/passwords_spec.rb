require "rails_helper"

RSpec.describe "Passwords", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:) }

  describe "GET /passwords/new" do
    it "パスワード再設定フォームを表示する" do
      get new_password_path
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("パスワード再設定")
      expect(response.body).to match(%r{<form[^>]*action="/passwords"[^>]*>})
    end
  end

  describe "POST /passwords" do
    context "存在するメールアドレスの場合" do
      it "パスワード再設定メールが送信され、完了ページにリダイレクトされる" do
        expect do
          post passwords_path, params: { email: credential.email }
        end.to have_enqueued_job(ActionMailer::MailDeliveryJob)

        expect(response).to redirect_to(created_passwords_path)
        expect(session[:password_reset_requested]).to be true
      end
    end

    context "存在しないメールアドレスの場合" do
      it "メールは送信されないが、完了ページにリダイレクトされる" do
        expect do
          post passwords_path, params: { email: "nonexistent@example.com" }
        end.not_to have_enqueued_job(ActionMailer::MailDeliveryJob)

        expect(response).to redirect_to(created_passwords_path)
        expect(session[:password_reset_requested]).to be true
      end
    end
  end

  describe "GET /passwords/created" do
    context "パスワード再設定リクエスト後の場合" do
      it "メール送信完了ページを表示する" do
        post passwords_path, params: { email: credential.email }
        follow_redirect!
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("メール送信完了")
        expect(response.body).to include("パスワード再設定のメールを送信しました")
      end
    end

    context "直接アクセスした場合" do
      it "パスワード再設定フォームにリダイレクトされる" do
        get created_passwords_path
        expect(response).to redirect_to(new_password_path)
      end
    end
  end

  describe "GET /passwords/:token/edit" do
    context "有効なトークンの場合" do
      let(:token) { credential.password_reset_token }

      it "パスワード更新フォームを表示する" do
        get edit_password_path(token)
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("新しいパスワードの設定")
        expect(response.body).to match(%r{<form[^>]*action="/passwords/#{token}"[^>]*>})
      end
    end

    context "無効なトークンの場合" do
      it "パスワード再設定フォームにリダイレクトされ、エラーメッセージが表示される" do
        get edit_password_path("invalid_token")
        expect(response).to redirect_to(new_password_path)
        follow_redirect!
        expect(response.body).to include("パスワード再設定リンクが無効か期限切れです。")
        expect(response.body).to match(%r{<form[^>]*action="/passwords"[^>]*>})
      end
    end
  end

  describe "PUT /passwords/:token" do
    let(:token) { credential.password_reset_token }

    context "パスワードが一致する場合" do
      it "パスワードが更新され、ログインページにリダイレクトされる" do
        put password_path(token), params: {
          password: "new_password123",
          password_confirmation: "new_password123",
        }

        expect(response).to redirect_to(new_session_path)
        follow_redirect!
        expect(response.body).to include("パスワードが更新されました。")

        # パスワードが実際に更新されているか確認
        credential.reload
        expect(credential.authenticate("new_password123")).to be_truthy
        expect(credential.authenticate("password123")).to be_falsy
      end
    end

    context "パスワードが一致しない場合" do
      it "エラーメッセージと共にパスワード更新フォームにリダイレクトされる" do
        put password_path(token), params: {
          password: "new_password123",
          password_confirmation: "different_password",
        }

        expect(response).to redirect_to(edit_password_path(token))
        follow_redirect!
        expect(response.body).to include("パスワードが一致しません。")
        expect(response.body).to match(%r{<form[^>]*action="/passwords/#{token}"[^>]*>})

        # パスワードが更新されていないか確認
        credential.reload
        expect(credential.authenticate("password123")).to be_truthy
        expect(credential.authenticate("new_password123")).to be_falsy
      end
    end

    context "無効なトークンの場合" do
      it "パスワード再設定フォームにリダイレクトされ、エラーメッセージが表示される" do
        put password_path("invalid_token"), params: {
          password: "new_password123",
          password_confirmation: "new_password123",
        }

        expect(response).to redirect_to(new_password_path)
        follow_redirect!
        expect(response.body).to include("パスワード再設定リンクが無効か期限切れです。")
        expect(response.body).to match(%r{<form[^>]*action="/passwords"[^>]*>})
      end
    end
  end
end

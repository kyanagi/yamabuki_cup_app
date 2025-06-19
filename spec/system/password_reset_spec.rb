require "rails_helper"

RSpec.describe "パスワード再設定", type: :system do
  include ActiveJob::TestHelper
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:) }
  let!(:player_profile) { create(:player_profile, player:) }

  before do
    # メール送信をテスト環境で確認するため
    ActionMailer::Base.deliveries.clear
  end

  describe "パスワード再設定フロー" do
    it "ログインページからパスワード再設定が完了するまでの全体フロー" do
      # ログインページにアクセス
      visit new_session_path
      expect(page).to have_content "ログイン"

      # パスワード再設定リンクをクリック
      click_link "パスワードを忘れた方"
      expect(page).to have_content "パスワード再設定"

      # メールアドレスを入力して送信
      fill_in "email", with: credential.email
      click_button "再設定メールを送信"

      # 完了ページが表示される
      expect(page).to have_content "メール送信完了"

      # メール送信は非同期で行われるため、UIフローの確認のみ行う
      # 実際のメール送信とトークン処理はrequest specでテストする

      # トークンを使ってパスワード更新フォームに直接アクセス
      reset_token = credential.password_reset_token
      visit edit_password_path(reset_token)

      # パスワード更新フォームが表示される
      expect(page).to have_content "新しいパスワードの設定"

      # 新しいパスワードを入力して更新
      fill_in "password", with: "new_password123"
      fill_in "password_confirmation", with: "new_password123"
      click_button "パスワードを更新"

      # ログインページにリダイレクトされ、成功メッセージが表示される
      expect(page).to have_content "ログイン"
      expect(page).to have_content "パスワードが更新されました。新しいパスワードでログインしてください。"

      # 新しいパスワードでログインできることを確認
      fill_in "email", with: credential.email
      fill_in "password", with: "new_password123"
      click_button "ログイン"

      # ログイン成功を確認（ホームページにリダイレクト）
      expect(page).to have_current_path("/home")
    end

    it "存在しないメールアドレスでも完了ページが表示されるが、メールは送信されない" do
      visit new_password_path

      fill_in "email", with: "nonexistent@example.com"
      click_button "再設定メールを送信"

      expect(page).to have_content "メール送信完了"

      expect(ActionMailer::Base.deliveries.count).to eq 0
    end

    it "パスワードが一致しない場合はエラーが表示される" do
      visit edit_password_path(credential.password_reset_token)

      fill_in "password", with: "new_password123"
      fill_in "password_confirmation", with: "different_password"
      click_button "パスワードを更新"

      expect(page).to have_content "新しいパスワードの設定"
      expect(page).to have_content "パスワードが一致しません。"
    end

    it "無効なトークンの場合はパスワード再設定フォームにリダイレクトされる" do
      visit edit_password_path("invalid_token")

      expect(page).to have_content "パスワード再設定"
      expect(page).to have_content "パスワード再設定リンクが無効か期限切れです。"
    end

    it "完了ページに直接アクセスした場合はパスワード再設定フォームにリダイレクトされる" do
      visit created_passwords_path

      expect(page).to have_content "パスワード再設定"
      expect(page).to have_current_path(new_password_path)
    end

    it "完了ページのナビゲーションリンクが機能する" do
      # パスワード再設定を実行して完了ページに到達
      visit new_password_path
      fill_in "email", with: credential.email
      click_button "再設定メールを送信"

      # 再設定をやり直すリンク
      click_link "再設定をやり直す"
      expect(page).to have_content "パスワード再設定"
      expect(page).to have_current_path(new_password_path)

      # 再度完了ページに戻る
      fill_in "email", with: credential.email
      click_button "再設定メールを送信"

      # ログインページに戻るリンク
      click_link "ログインページに戻る"
      expect(page).to have_content "ログイン"
      expect(page).to have_current_path(new_session_path)
    end
  end
end

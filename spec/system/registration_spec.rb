require "rails_helper"

RSpec.describe "新規エントリー", type: :system do
  let(:valid_attributes) do
    {
      email: "test@example.com",
      password: "password123",
      family_name: "山吹",
      given_name: "太郎",
      family_name_kana: "やまぶき",
      given_name_kana: "たろう",
      entry_list_name: "山吹太郎",
      notes: "よろしくお願いします",
    }
  end

  before do
    Rails.application.load_seed
    # エントリー受付を有効にする
    allow(Setting).to receive(:registerable).and_return(true)
  end

  describe "正常なエントリーフロー" do
    it "新規エントリーページから正常にエントリーが完了する" do
      visit new_registration_path

      expect(page).to have_content "新規エントリー"
      expect(page).to have_link "こちらからログイン", href: new_session_path

      # フォームに入力
      fill_in "registration[email]", with: valid_attributes[:email]
      fill_in "registration[password]", with: valid_attributes[:password]
      fill_in "registration[family_name]", with: valid_attributes[:family_name]
      fill_in "registration[given_name]", with: valid_attributes[:given_name]
      fill_in "registration[family_name_kana]", with: valid_attributes[:family_name_kana]
      fill_in "registration[given_name_kana]", with: valid_attributes[:given_name_kana]
      fill_in "registration[entry_list_name]", with: valid_attributes[:entry_list_name]
      fill_in "registration[notes]", with: valid_attributes[:notes]

      # 確認ボタンをクリック
      click_button "確認する"

      # 確認モーダルが表示される
      within ".modal" do
        expect(page).to have_content "エントリー内容の確認"
        expect(page).to have_content valid_attributes[:email]
        expect(page).to have_content "#{valid_attributes[:family_name]} #{valid_attributes[:given_name]}"
        expect(page).to have_content "#{valid_attributes[:family_name_kana]} #{valid_attributes[:given_name_kana]}"
        expect(page).to have_content valid_attributes[:entry_list_name]
        expect(page).to have_content valid_attributes[:notes]

        # 送信ボタンをクリック
        click_button "送信する"
      end

      # ホームページにリダイレクトされる
      expect(page).to have_current_path("/home")

      # プレイヤーが作成されていることを確認
      player = Player.joins(:player_email_credential).find_by(player_email_credentials: { email: valid_attributes[:email] })
      expect(player).to be_present

      # プロフィールが作成されていることを確認
      profile = player.player_profile
      expect(profile.family_name).to eq valid_attributes[:family_name]
      expect(profile.given_name).to eq valid_attributes[:given_name]
      expect(profile.family_name_kana).to eq valid_attributes[:family_name_kana]
      expect(profile.given_name_kana).to eq valid_attributes[:given_name_kana]
      expect(profile.entry_list_name).to eq valid_attributes[:entry_list_name]

      # 3R コース選択設定が作成されていることを確認
      expect(player.round3_course_preference).to be_present
    end

    it "確認モーダルでキャンセルできる" do
      visit new_registration_path

      # Stimulusコントローラが初期化されるまで待機
      expect(page).to have_css("[data-controller='entry-form modal']")

      # フォームに入力
      fill_in "registration[email]", with: valid_attributes[:email]
      fill_in "registration[password]", with: valid_attributes[:password]
      fill_in "registration[family_name]", with: valid_attributes[:family_name]
      fill_in "registration[given_name]", with: valid_attributes[:given_name]
      fill_in "registration[family_name_kana]", with: valid_attributes[:family_name_kana]
      fill_in "registration[given_name_kana]", with: valid_attributes[:given_name_kana]
      fill_in "registration[entry_list_name]", with: valid_attributes[:entry_list_name]

      click_button "確認する"

      # モーダルが表示されるまで待機
      expect(page).to have_css(".modal.is-active")

      # モーダルでキャンセル
      within ".modal.is-active" do
        click_button "キャンセル"
      end

      # モーダルが閉じて、フォームに戻る
      expect(page).not_to have_css(".modal.is-active")
      expect(page).to have_content "新規エントリー"

      # プレイヤーが作成されていないことを確認
      expect(Player.joins(:player_email_credential).where(player_email_credentials: { email: valid_attributes[:email] })).to be_empty
    end
  end

  describe "バリデーションエラー" do
    it "必須項目が未入力の場合はエラーが表示される" do
      visit new_registration_path

      # 何も入力せずに確認ボタンをクリック
      click_button "確認する"

      # エラーメッセージが表示される
      expect(page).to have_content "メールアドレスを入力してください"
      expect(page).to have_content "パスワードを入力してください"
      expect(page).to have_content "姓を入力してください"
      expect(page).to have_content "名を入力してください"
      expect(page).to have_content "姓（ふりがな）を入力してください"
      expect(page).to have_content "名（ふりがな）を入力してください"
      expect(page).to have_content "エントリーリストの名前を入力してください"

      # モーダルは表示されない
      expect(page).not_to have_css(".modal.is-active")
    end

    it "メールアドレスの形式が不正な場合はエラーが表示される" do
      visit new_registration_path

      fill_in "registration[email]", with: "invalid-email"
      fill_in "registration[password]", with: valid_attributes[:password]
      fill_in "registration[family_name]", with: valid_attributes[:family_name]
      fill_in "registration[given_name]", with: valid_attributes[:given_name]
      fill_in "registration[family_name_kana]", with: valid_attributes[:family_name_kana]
      fill_in "registration[given_name_kana]", with: valid_attributes[:given_name_kana]
      fill_in "registration[entry_list_name]", with: valid_attributes[:entry_list_name]

      click_button "確認する"

      expect(page).to have_content "有効なメールアドレスを入力してください"
    end

    it "既に登録済みのメールアドレスの場合はエラーが表示される" do
      existing_player = create(:player)
      create(:player_email_credential, player: existing_player, email: valid_attributes[:email])

      visit new_registration_path

      fill_in "registration[email]", with: valid_attributes[:email]
      fill_in "registration[password]", with: valid_attributes[:password]
      fill_in "registration[family_name]", with: valid_attributes[:family_name]
      fill_in "registration[given_name]", with: valid_attributes[:given_name]
      fill_in "registration[family_name_kana]", with: valid_attributes[:family_name_kana]
      fill_in "registration[given_name_kana]", with: valid_attributes[:given_name_kana]
      fill_in "registration[entry_list_name]", with: valid_attributes[:entry_list_name]

      click_button "確認する"

      within ".modal" do
        click_button "送信する"
      end

      expect(page).to have_content "メールアドレスは既に登録されています。ログインページからログインしてください。"
    end
  end

  describe "エントリー受付停止時" do
    before do
      allow(Setting).to receive(:registerable).and_return(false)
    end

    it "エントリー受付停止ページが表示される" do
      visit new_registration_path

      expect(page).to have_content "エントリー受付は終了しました"
      expect(page).not_to have_content "新規エントリー"
    end
  end
end

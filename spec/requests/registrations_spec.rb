require "rails_helper"

RSpec.describe "Registrations", type: :request do
  before do
    Rails.application.load_seed
    Setting.update!(registerable: true, entry_phase: "primary", capacity: 100)
  end

  describe "POST /registrations" do
    let(:valid_params) do
      {
        registration: {
          email: "test@example.com",
          password: "password123",
          family_name: "伊藤",
          given_name: "博文",
          family_name_kana: "イトウ",
          given_name_kana: "ヒロブミ",
          entry_list_name: "総理",
          notes: "",
        },
      }
    end

    context "有効なパラメータの場合" do
      it "ユーザーと entry が作成され、ホームページにリダイレクトされる" do
        expect do
          post registrations_path, params: valid_params
        end.to change(Player, :count).by(1)
          .and change(PlayerEmailCredential, :count).by(1)
          .and change(PlayerProfile, :count).by(1)
          .and change(Entry, :count).by(1)

        expect(response).to redirect_to(home_path)
        expect(session[:registration_completed]).to be true

        entry = Entry.last
        expect(entry).to be_primary
        expect(entry).to be_pending
        expect(entry.priority).to be_nil
      end
    end

    context "重複するメールアドレスの場合" do
      before do
        player = create(:player)
        create(:player_email_credential, player:, email: "test@example.com")
      end

      it "エラーメッセージが表示され、ユーザーは作成されない" do
        expect do
          post registrations_path, params: valid_params
        end.not_to change(Player, :count)

        expect(response).to have_http_status(422)
        expect(response.body).to include("は既に登録されています。ログインページからログインしてください。")
      end
    end

    context "無効なメールアドレス形式の場合" do
      let(:invalid_email_params) do
        valid_params.deep_merge(
          registration: { email: "invalid-email" }
        )
      end

      it "エラーメッセージが表示され、ユーザーは作成されない" do
        expect do
          post registrations_path, params: invalid_email_params
        end.not_to change(Player, :count)

        expect(response).to have_http_status(422)
        expect(response.body).to include("は不正な値です")
      end
    end

    context "必須項目が未入力の場合" do
      let(:invalid_params) do
        {
          registration: {
            email: "",
            password: "",
            family_name: "",
            given_name: "",
            family_name_kana: "",
            given_name_kana: "",
            entry_list_name: "",
          },
        }
      end

      it "エラーメッセージが表示され、ユーザーは作成されない" do
        expect do
          post registrations_path, params: invalid_params
        end.not_to change(Player, :count)

        expect(response).to have_http_status(422)
        expect(response.body).to include("を入力してください")
      end
    end

    context "entry_phase が nil の場合" do
      before do
        Setting.update!(registerable: true, entry_phase: nil, capacity: 100)
      end

      it "エラーとなり登録されない" do
        expect do
          post registrations_path, params: valid_params
        end.not_to change(Player, :count)

        expect(response).to have_http_status(422)
        expect(response.body).to include("エントリー受付期間外です")
      end
    end

    context "二次エントリーで定員に空きがある場合" do
      before do
        Setting.update!(registerable: true, entry_phase: "secondary", capacity: 1)
      end

      it "accepted として登録される" do
        post registrations_path, params: valid_params

        expect(response).to redirect_to(home_path)
        expect(Entry.last).to be_secondary
        expect(Entry.last).to be_accepted
        expect(Entry.last.priority).to eq(1)
      end
    end

    context "二次エントリーで定員が埋まっている場合" do
      before do
        Setting.update!(registerable: true, entry_phase: "secondary", capacity: 1)
        create(:entry, status: :accepted, priority: 1)
      end

      it "waitlisted として登録される" do
        post registrations_path, params: valid_params

        expect(response).to redirect_to(home_path)
        expect(Entry.last).to be_secondary
        expect(Entry.last).to be_waitlisted
        expect(Entry.last.priority).to eq(2)
      end
    end
  end
end

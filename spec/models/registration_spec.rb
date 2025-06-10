require "rails_helper"

RSpec.describe Registration, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "バリデーション" do
    it "必須項目が入力されている場合は有効" do
      registration = Registration.new(
        email: "test@example.com",
        password: "password123",
        family_name: "伊藤",
        given_name: "博文",
        family_name_kana: "イトウ",
        given_name_kana: "ヒロブミ",
        entry_list_name: "総理"
      )
      expect(registration).to be_valid
    end

    it "必須項目が未入力の場合は無効" do
      registration = Registration.new
      expect(registration).not_to be_valid
      expect(registration.errors[:email]).to include("can't be blank")
      expect(registration.errors[:password]).to include("can't be blank")
      expect(registration.errors[:family_name]).to include("can't be blank")
      expect(registration.errors[:given_name]).to include("can't be blank")
      expect(registration.errors[:family_name_kana]).to include("can't be blank")
      expect(registration.errors[:given_name_kana]).to include("can't be blank")
      expect(registration.errors[:entry_list_name]).to include("can't be blank")
    end
  end

  describe "#create_player_data" do
    let(:registration) do
      Registration.new(
        email: "test@example.com",
        password: "password123",
        family_name: "伊藤",
        given_name: "博文",
        family_name_kana: "イトウ",
        given_name_kana: "ヒロブミ",
        entry_list_name: "総理"
      )
    end

    it "プレイヤーデータが正しく作成される" do
      expect { registration.save! }.to change(Player, :count).by(1)
        .and change(PlayerEmailCredential, :count).by(1)
        .and change(PlayerProfile, :count).by(1)
        .and change(Round3CoursePreference, :count).by(1)

      player = registration.player
      expect(player).to be_present
      expect(player.player_email_credential.email).to eq("test@example.com")
      expect(player.player_profile.family_name).to eq("伊藤")
      expect(player.player_profile.given_name).to eq("博文")
      expect(player.player_profile.family_name_kana).to eq("イトウ")
      expect(player.player_profile.given_name_kana).to eq("ヒロブミ")
      expect(player.player_profile.entry_list_name).to eq("総理")
    end

    it "エラーが発生した場合は全てのデータがロールバックされる" do
      allow(PlayerProfile).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(PlayerProfile.new))

      expect { registration.save! }.to raise_error(ActiveRecord::RecordInvalid)
      expect(Player.count).to eq(0)
      expect(PlayerEmailCredential.count).to eq(0)
      expect(PlayerProfile.count).to eq(0)
      expect(Round3CoursePreference.count).to eq(0)
    end
  end
end

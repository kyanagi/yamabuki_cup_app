require "rails_helper"

RSpec.describe PlayerProfileEdit, type: :model do
  let(:player) { create(:player) }
  let(:player_profile) { create(:player_profile, player:) }
  let(:player_email_credential) { create(:player_email_credential, player:) }

  before do
    player_profile
    player_email_credential
  end

  describe "バリデーション" do
    it "必須項目が入力されている場合は有効" do
      player_profile_edit = PlayerProfileEdit.new(
        player_id: player.id,
        email: "updated@example.com",
        family_name: "田中",
        given_name: "太郎",
        family_name_kana: "タナカ",
        given_name_kana: "タロウ",
        entry_list_name: "たなかちゃん"
      )
      expect(player_profile_edit).to be_valid
    end

    it "必須項目が未入力の場合は無効" do
      player_profile_edit = PlayerProfileEdit.new(player_id: player.id)
      # Clear the defaults set by initialize
      player_profile_edit.email = nil
      player_profile_edit.family_name = nil
      player_profile_edit.given_name = nil
      player_profile_edit.family_name_kana = nil
      player_profile_edit.given_name_kana = nil
      player_profile_edit.entry_list_name = nil

      expect(player_profile_edit).not_to be_valid
      expect(player_profile_edit.errors[:email]).to include("を入力してください")
      expect(player_profile_edit.errors[:family_name]).to include("を入力してください")
      expect(player_profile_edit.errors[:given_name]).to include("を入力してください")
      expect(player_profile_edit.errors[:family_name_kana]).to include("を入力してください")
      expect(player_profile_edit.errors[:given_name_kana]).to include("を入力してください")
      expect(player_profile_edit.errors[:entry_list_name]).to include("を入力してください")
    end

    it "パスワードは省略可能" do
      player_profile_edit = PlayerProfileEdit.new(
        player_id: player.id,
        email: "updated@example.com",
        family_name: "田中",
        given_name: "太郎",
        family_name_kana: "タナカ",
        given_name_kana: "タロウ",
        entry_list_name: "たなかちゃん"
        # password is not provided
      )
      expect(player_profile_edit).to be_valid
    end
  end

  describe "#initialize" do
    it "player_idが提供された場合、現在のプレイヤー情報でデフォルト値を設定する" do
      player_profile_edit = PlayerProfileEdit.new(player_id: player.id)

      expect(player_profile_edit.player_id).to eq(player.id)
      expect(player_profile_edit.email).to eq(player_email_credential.email)
      expect(player_profile_edit.family_name).to eq(player_profile.family_name)
      expect(player_profile_edit.given_name).to eq(player_profile.given_name)
      expect(player_profile_edit.family_name_kana).to eq(player_profile.family_name_kana)
      expect(player_profile_edit.given_name_kana).to eq(player_profile.given_name_kana)
      expect(player_profile_edit.entry_list_name).to eq(player_profile.entry_list_name)
    end

    it "属性がmergeされた場合、提供された値が優先される" do
      player_profile_edit = PlayerProfileEdit.new(
        player_id: player.id,
        email: "override@example.com",
        family_name: "上書き"
      )

      expect(player_profile_edit.email).to eq("override@example.com")
      expect(player_profile_edit.family_name).to eq("上書き")
      # Other attributes should use defaults
      expect(player_profile_edit.given_name).to eq(player_profile.given_name)
    end

    it "player_idが提供されない場合、デフォルト値は設定されない" do
      player_profile_edit = PlayerProfileEdit.new(email: "test@example.com")

      expect(player_profile_edit.email).to eq("test@example.com")
      expect(player_profile_edit.family_name).to be_nil
    end
  end

  describe "#update_player_data" do
    let(:player_profile_edit) do
      PlayerProfileEdit.new(
        player_id: player.id,
        email: "updated@example.com",
        password: "newpassword123",
        family_name: "田中",
        given_name: "太郎",
        family_name_kana: "タナカ",
        given_name_kana: "タロウ",
        entry_list_name: "たなかちゃん"
      )
    end

    it "プレイヤープロフィールとメール認証情報が正しく更新される" do
      # Save and verify no new records are created
      player_profile_edit.save!

      expect(Player.count).to eq(1)
      expect(PlayerEmailCredential.count).to eq(1)
      expect(PlayerProfile.count).to eq(1)

      player.reload
      expect(player.player_email_credential.email).to eq("updated@example.com")
      expect(player.player_email_credential.authenticate("newpassword123")).to be_truthy
      expect(player.player_profile.family_name).to eq("田中")
      expect(player.player_profile.given_name).to eq("太郎")
      expect(player.player_profile.family_name_kana).to eq("タナカ")
      expect(player.player_profile.given_name_kana).to eq("タロウ")
      expect(player.player_profile.entry_list_name).to eq("たなかちゃん")
    end

    it "パスワードが空の場合、パスワードは更新されない" do
      original_password_digest = player.player_email_credential.password_digest

      player_profile_edit = PlayerProfileEdit.new(
        player_id: player.id,
        email: "updated@example.com",
        password: "", # Empty password
        family_name: "田中",
        given_name: "太郎",
        family_name_kana: "タナカ",
        given_name_kana: "タロウ",
        entry_list_name: "たなかちゃん"
      )

      player_profile_edit.save!
      player.reload

      expect(player.player_email_credential.email).to eq("updated@example.com")
      expect(player.player_email_credential.password_digest).to eq(original_password_digest)
      expect(player.player_profile.family_name).to eq("田中")
    end

    it "パスワードがnilの場合、パスワードは更新されない" do
      original_password_digest = player.player_email_credential.password_digest

      player_profile_edit = PlayerProfileEdit.new(
        player_id: player.id,
        email: "updated@example.com",
        password: nil, # Nil password
        family_name: "田中",
        given_name: "太郎",
        family_name_kana: "タナカ",
        given_name_kana: "タロウ",
        entry_list_name: "たなかちゃん"
      )

      player_profile_edit.save!
      player.reload

      expect(player.player_email_credential.email).to eq("updated@example.com")
      expect(player.player_email_credential.password_digest).to eq(original_password_digest)
    end

    it "エラーが発生した場合は全ての変更がロールバックされる" do
      original_email = player_email_credential.email
      original_family_name = player_profile.family_name

      # Mock the player_profile to raise an error
      allow_any_instance_of(PlayerProfile).to receive(:update!).and_raise(ActiveRecord::RecordInvalid.new(PlayerProfile.new))

      expect { player_profile_edit.save! }.to raise_error(ActiveRecord::RecordInvalid)

      player.reload
      expect(player.player_email_credential.email).to eq(original_email)
      expect(player.player_profile.family_name).to eq(original_family_name)
    end
  end

  describe "belongs_to :player" do
    it "playerとの関連が正しく設定される" do
      player_profile_edit = PlayerProfileEdit.new(player_id: player.id)
      expect(player_profile_edit.player).to eq(player)
    end
  end
end

require "rails_helper"

RSpec.describe AdminUser, type: :model do
  describe "バリデーション" do
    it "usernameが必須であること" do
      admin_user = AdminUser.new(username: nil, password: "password123")
      expect(admin_user).not_to be_valid
      expect(admin_user.errors[:username]).to include("を入力してください")
    end

    it "usernameが一意であること" do
      create(:admin_user, username: "admin")
      admin_user = AdminUser.new(username: "admin", password: "password123")
      expect(admin_user).not_to be_valid
      expect(admin_user.errors[:username]).to include("はすでに存在します")
    end

    it "passwordが必須であること（新規作成時）" do
      admin_user = AdminUser.new(username: "admin", password: nil)
      expect(admin_user).not_to be_valid
      expect(admin_user.errors[:password]).to include("を入力してください")
    end

    it "有効なusernameとpasswordで保存できること" do
      admin_user = AdminUser.new(username: "admin", password: "password123")
      expect(admin_user).to be_valid
    end
  end

  describe ".authenticate_by" do
    let!(:admin_user) { create(:admin_user, username: "admin", password: "password123") }

    context "正しいusernameとpasswordの場合" do
      it "AdminUserを返すこと" do
        result = AdminUser.authenticate_by(username: "admin", password: "password123")
        expect(result).to eq(admin_user)
      end
    end

    context "usernameが間違っている場合" do
      it "nilを返すこと" do
        result = AdminUser.authenticate_by(username: "wrong", password: "password123")
        expect(result).to be_nil
      end
    end

    context "passwordが間違っている場合" do
      it "nilを返すこと" do
        result = AdminUser.authenticate_by(username: "admin", password: "wrong")
        expect(result).to be_nil
      end
    end
  end

  describe "アソシエーション" do
    it "admin_sessionsを持つこと" do
      admin_user = create(:admin_user)
      expect(admin_user).to respond_to(:admin_sessions)
    end
  end
end

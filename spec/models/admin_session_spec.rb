require "rails_helper"

RSpec.describe AdminSession, type: :model do
  describe "アソシエーション" do
    it "admin_userに属すること" do
      admin_session = build(:admin_session)
      expect(admin_session.admin_user).to be_present
    end
  end

  describe "属性" do
    it "ip_address, user_agentを保存できること" do
      admin_user = create(:admin_user)
      admin_session = AdminSession.create!(
        admin_user: admin_user,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0"
      )

      expect(admin_session.ip_address).to eq("192.168.1.1")
      expect(admin_session.user_agent).to eq("Mozilla/5.0")
    end
  end
end

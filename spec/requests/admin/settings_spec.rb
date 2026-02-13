require "rails_helper"

RSpec.describe "Admin::Settings", type: :request do
  before do
    sign_in_admin
  end

  describe "PUT /admin/settings" do
    it "設定を更新できる" do
      put admin_settings_path,
          params: {
            registerable: "true",
            round3_course_preference_editable: "true",
            capacity: "123",
            entry_phase: "secondary",
          }

      expect(response).to redirect_to(admin_settings_path)
      expect(Setting.registerable).to be true
      expect(Setting.round3_course_preference_editable).to be true
      expect(Setting.capacity).to eq(123)
      expect(Setting.entry_phase).to eq("secondary")
    end

    it "チェックボックス未送信時は false になる" do
      put admin_settings_path,
          params: {
            capacity: "10",
            entry_phase: "primary",
          }

      expect(response).to redirect_to(admin_settings_path)
      expect(Setting.registerable).to be false
      expect(Setting.round3_course_preference_editable).to be false
    end

    it "不正な capacity は422で再表示する" do
      put admin_settings_path,
          params: {
            registerable: "true",
            round3_course_preference_editable: "true",
            capacity: "-1",
            entry_phase: "primary",
          }

      expect(response).to have_http_status(422)
      expect(response.body).to include("capacity は0以上の整数で指定してください")
    end
  end
end

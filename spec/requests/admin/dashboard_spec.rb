require "rails_helper"

RSpec.describe "Admin::Dashboard", type: :request do
  describe "GET /admin" do
    context "admin権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :admin)) }

      it "早押し機連携へのリンクが表示される" do
        get "/admin"

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("早押し機連携")
        expect(response.body).to include(admin_buzzer_controls_path)
      end
    end

    context "staff権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :staff)) }

      it "早押し機連携へのリンクが表示される" do
        get "/admin"

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("早押し機連携")
        expect(response.body).to include(admin_buzzer_controls_path)
      end
    end
  end
end

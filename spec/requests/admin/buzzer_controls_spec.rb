require "rails_helper"

RSpec.describe "Admin::BuzzerControls", type: :request do
  describe "権限チェック" do
    context "admin権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :admin)) }

      it "GET /admin/buzzer_controls にアクセスできること" do
        get "/admin/buzzer_controls"

        expect(response).to have_http_status(:ok)
      end
    end

    context "staff権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :staff)) }

      it "GET /admin/buzzer_controls にアクセスできること" do
        get "/admin/buzzer_controls"

        expect(response).to have_http_status(:ok)
      end
    end

    context "未ログインの場合" do
      it "ログイン画面へリダイレクトされること" do
        get "/admin/buzzer_controls"

        expect(response).to redirect_to(new_admin_session_path)
      end
    end
  end
end

require "rails_helper"

RSpec.describe "Admin::QuizReader", type: :request do
  describe "権限チェック" do
    before do
      create(:question_provider)
    end

    context "admin権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :admin)) }

      it "GET /admin/quiz_reader にアクセスできること" do
        get "/admin/quiz_reader"
        expect(response).to have_http_status(:ok)
      end
    end

    context "staff権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :staff)) }

      describe "GET /admin/quiz_reader" do
        it "403 Forbiddenを返すこと" do
          get "/admin/quiz_reader"
          expect(response).to have_http_status(:forbidden)
        end

        it "エラーメッセージがボディに含まれること" do
          get "/admin/quiz_reader"
          expect(response.body).to include("この操作を行う権限がありません。")
        end
      end
    end
  end
end

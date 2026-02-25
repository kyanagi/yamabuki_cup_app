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

  describe "初期表示" do
    before do
      create(:question_provider)
      sign_in_admin(create(:admin_user, role: :admin))
    end

    it "問い読みOFFが初期状態のとき、Next問題文は非表示でカードはグレーアウトされること" do
      get "/admin/quiz_reader"

      expect(response).to have_http_status(:ok)

      document = response.parsed_body

      next_question_box = document.at_css('[data-quiz-reader-target="nextQuestionBox"]')
      next2_question_box = document.at_css('[data-quiz-reader-target="next2QuestionBox"]')
      next_question_content = document.at_css('[data-quiz-reader-target="nextQuestionContent"]')
      next2_question_content = document.at_css('[data-quiz-reader-target="next2QuestionContent"]')

      expect(next_question_box["class"]).to include("quiz-reader-off-air")
      expect(next2_question_box["class"]).to include("quiz-reader-off-air")
      expect(next_question_content["class"]).to include("is-hidden")
      expect(next2_question_content["class"]).to include("is-hidden")
    end
  end
end

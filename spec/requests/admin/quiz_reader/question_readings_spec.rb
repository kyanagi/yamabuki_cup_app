require "rails_helper"

RSpec.describe "Admin::QuizReader::QuestionReadings", type: :request do
  describe "権限チェック" do
    context "admin権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :admin)) }

      let(:question) { create(:question) }
      let(:valid_params) do
        {
          question_reading: {
            question_id: question.id,
            read_duration: 3.0,
            full_duration: 6.0,
          },
        }
      end

      it "POST /admin/quiz_reader/question_readings にアクセスできること" do
        post "/admin/quiz_reader/question_readings", params: valid_params
        expect(response).to have_http_status(:ok)
      end
    end

    context "staff権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :staff)) }

      let(:question) { create(:question) }
      let(:valid_params) do
        {
          question_reading: {
            question_id: question.id,
            read_duration: 3.0,
            full_duration: 6.0,
          },
        }
      end

      it "JSONリクエストで403 Forbiddenを返すこと" do
        post "/admin/quiz_reader/question_readings",
             params: valid_params,
             headers: { "Accept" => "application/json" },
             as: :json
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "機能テスト" do
    before do
      sign_in_admin
    end

    describe "POST /admin/quiz_reader/question_readings" do
      let(:question) { create(:question) }
      let(:valid_params) do
        {
          question_reading: {
            question_id: question.id,
            read_duration: 3.0,
            full_duration: 6.0,
          },
        }
      end

      context "正常系" do
        it "QuestionReadingを作成し、JSONとして返す" do
          expect do
            post "/admin/quiz_reader/question_readings", params: valid_params
          end.to change(QuestionReading, :count).by(1)

          expect(response).to have_http_status(:ok)
          json = response.parsed_body
          expect(json["question_id"]).to eq question.id
          expect(json["read_duration"]).to eq 3.0
          expect(json["full_duration"]).to eq 6.0
        end
      end

      context "異常系" do
        context "question_idが存在しない場合" do
          let(:invalid_params) do
            {
              question_reading: {
                question_id: 999999,
                read_duration: 3.0,
                full_duration: 6.0,
              },
            }
          end

          it "エラーを返す" do
            post "/admin/quiz_reader/question_readings", params: invalid_params
            expect(response).to have_http_status(422)
          end
        end
      end
    end
  end
end

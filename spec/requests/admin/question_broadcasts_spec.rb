require "rails_helper"

RSpec.describe "Admin::QuestionBroadcasts", type: :request do
  describe "権限チェック" do
    context "admin権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :admin)) }

      it "GET /admin/question_broadcasts/new にアクセスできること" do
        get "/admin/question_broadcasts/new"
        expect(response).to have_http_status(:ok)
      end
    end

    context "staff権限の場合" do
      before { sign_in_admin(create(:admin_user, role: :staff)) }

      describe "GET /admin/question_broadcasts/new" do
        it "403 Forbiddenを返すこと" do
          get "/admin/question_broadcasts/new"
          expect(response).to have_http_status(:forbidden)
        end

        it "エラーメッセージがボディに含まれること" do
          get "/admin/question_broadcasts/new"
          expect(response.body).to include("この操作を行う権限がありません。")
        end
      end

      describe "POST /admin/question_broadcasts" do
        let(:question) { create(:question) }

        it "HTMLリクエストで403 Forbiddenを返すこと" do
          post "/admin/question_broadcasts", params: { question_id: question.id }
          expect(response).to have_http_status(:forbidden)
        end

        it "JSONリクエストで403 Forbiddenを返すこと" do
          post "/admin/question_broadcasts",
               params: { question_id: question.id },
               headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
               as: :json
          expect(response).to have_http_status(:forbidden)
        end
      end

      describe "POST /admin/question_broadcasts/clear" do
        it "403 Forbiddenを返すこと" do
          post "/admin/question_broadcasts/clear"
          expect(response).to have_http_status(:forbidden)
        end
      end

      describe "POST /admin/question_broadcasts/sample" do
        it "403 Forbiddenを返すこと" do
          post "/admin/question_broadcasts/sample", params: { text: "テスト", answer: "答え" }
          expect(response).to have_http_status(:forbidden)
        end
      end
    end
  end

  describe "機能テスト" do
    before do
      sign_in_admin
    end

    describe "GET /admin/question_broadcasts/new" do
      it "returns 200" do
        get "/admin/question_broadcasts/new"
        expect(response).to have_http_status(200)
      end
    end

    describe "POST /admin/question_broadcasts" do
      context "正常系" do
        let(:question) { create(:question) }

        it "指定されたQuestionをbroadcastしてリダイレクトする" do
          post "/admin/question_broadcasts", params: { question_id: question.id }
          expect(response).to redirect_to(new_admin_question_broadcast_path)
        end

        it "成功メッセージがflashに設定される" do
          post "/admin/question_broadcasts", params: { question_id: question.id }
          follow_redirect!
          expect(response.body).to include("送出しました")
        end

        it "scoreboard.question_show 通知が発火され、payload に text と answer が含まれる" do
          received = []
          ActiveSupport::Notifications.subscribed(
            ->(_name, _started, _finished, _uid, payload) { received << payload },
            "scoreboard.question_show"
          ) do
            post "/admin/question_broadcasts", params: { question_id: question.id }
          end
          expect(received.size).to eq 1
          expect(received.first[:payload]).to include(text: question.text, answer: question.answer)
        end
      end

      context "異常系" do
        context "存在しないQuestion IDが指定された場合" do
          it "エラーメッセージを表示してリダイレクトする" do
            post "/admin/question_broadcasts", params: { question_id: 999999 }
            expect(response).to redirect_to(new_admin_question_broadcast_path)
            follow_redirect!
            expect(response.body).to include("見つかりません")
          end

          it "scoreboard.question_show 通知は発火されない" do
            received = []
            ActiveSupport::Notifications.subscribed(
              ->(_name, _started, _finished, _uid, payload) { received << payload },
              "scoreboard.question_show"
            ) do
              post "/admin/question_broadcasts", params: { question_id: 999999 }
            end
            expect(received).to be_empty
          end
        end

        context "Question IDが空の場合" do
          it "エラーメッセージを表示してリダイレクトする" do
            post "/admin/question_broadcasts", params: { question_id: "" }
            expect(response).to redirect_to(new_admin_question_broadcast_path)
            follow_redirect!
            expect(response.body).to include("見つかりません")
          end

          it "scoreboard.question_show 通知は発火されない" do
            received = []
            ActiveSupport::Notifications.subscribed(
              ->(_name, _started, _finished, _uid, payload) { received << payload },
              "scoreboard.question_show"
            ) do
              post "/admin/question_broadcasts", params: { question_id: "" }
            end
            expect(received).to be_empty
          end
        end
      end

      context "JSONリクエスト" do
        context "正常系" do
          let(:question) { create(:question) }

          it "200を返す" do
            post "/admin/question_broadcasts",
                 params: { question_id: question.id },
                 headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                 as: :json
            expect(response).to have_http_status(:ok)
          end

          it "JSONレスポンスにsuccess: trueとquestion_idが含まれる" do
            post "/admin/question_broadcasts",
                 params: { question_id: question.id },
                 headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                 as: :json
            json = response.parsed_body
            expect(json["success"]).to be true
            expect(json["question_id"]).to eq question.id
          end

          it "scoreboard.question_show 通知が発火され、payload に text と answer が含まれる" do
            received = []
            ActiveSupport::Notifications.subscribed(
              ->(_name, _started, _finished, _uid, payload) { received << payload },
              "scoreboard.question_show"
            ) do
              post "/admin/question_broadcasts",
                   params: { question_id: question.id },
                   headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                   as: :json
            end
            expect(received.size).to eq 1
            expect(received.first[:payload]).to include(text: question.text, answer: question.answer)
          end
        end

        context "異常系" do
          context "存在しないQuestion IDが指定された場合" do
            it "404を返す" do
              post "/admin/question_broadcasts",
                   params: { question_id: 999999 },
                   headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                   as: :json
              expect(response).to have_http_status(:not_found)
            end

            it "JSONレスポンスにerrorが含まれる" do
              post "/admin/question_broadcasts",
                   params: { question_id: 999999 },
                   headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                   as: :json
              json = response.parsed_body
              expect(json["error"]).to be_present
            end
          end
        end
      end
    end

    describe "POST /admin/question_broadcasts/sample" do
      let(:sample_text) { "サンプル問題文です" }
      let(:sample_answer) { "サンプル答え" }

      it "サンプルテキスト送出後、リダイレクトする" do
        post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        expect(response).to redirect_to(new_admin_question_broadcast_path)
      end

      it "成功メッセージがflashに設定される" do
        post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        follow_redirect!
        expect(response.body).to include("サンプルテキストを送出しました")
      end

      it "scoreboard.question_show 通知が発火され、payload に text と answer が含まれる" do
        received = []
        ActiveSupport::Notifications.subscribed(
          ->(_name, _started, _finished, _uid, payload) { received << payload },
          "scoreboard.question_show"
        ) do
          post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        end
        expect(received.size).to eq 1
        expect(received.first[:payload]).to include(text: sample_text, answer: sample_answer)
      end

      context "テキストが空の場合" do
        it "broadcastが行われてリダイレクトする" do
          post "/admin/question_broadcasts/sample", params: { text: "", answer: "" }
          expect(response).to redirect_to(new_admin_question_broadcast_path)
        end
      end
    end

    describe "POST /admin/question_broadcasts/clear" do
      it "問題消去後、リダイレクトする" do
        post "/admin/question_broadcasts/clear"
        expect(response).to redirect_to(new_admin_question_broadcast_path)
      end

      it "成功メッセージがflashに設定される" do
        post "/admin/question_broadcasts/clear"
        follow_redirect!
        expect(response.body).to include("消去しました")
      end

      it "scoreboard.question_clear 通知が発火される" do
        received = []
        ActiveSupport::Notifications.subscribed(
          ->(_name, _started, _finished, _uid, _payload) { received << true },
          "scoreboard.question_clear"
        ) do
          post "/admin/question_broadcasts/clear"
        end
        expect(received.size).to eq 1
      end
    end
  end
end

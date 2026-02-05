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

        it "scoreboardチャンネルにbroadcastが行われる" do
          expect do
            post "/admin/question_broadcasts", params: { question_id: question.id }
          end.to have_broadcasted_to("scoreboard")
        end

        it "broadcastされる内容にquestionのturbo_stream replace_questionが含まれる" do
          expect do
            post "/admin/question_broadcasts", params: { question_id: question.id }
          end.to(have_broadcasted_to("scoreboard").with do |data|
            expect(data).to include("turbo-stream")
            expect(data).to include('action="replace_question"')
            expect(data).to include('target="question"')
            expect(data).to include(question.text)
            expect(data).to include(question.answer)
          end)
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

          it "broadcastは行われない" do
            expect do
              post "/admin/question_broadcasts", params: { question_id: 999999 }
            end.not_to have_broadcasted_to("scoreboard")
          end
        end

        context "Question IDが空の場合" do
          it "エラーメッセージを表示してリダイレクトする" do
            post "/admin/question_broadcasts", params: { question_id: "" }
            expect(response).to redirect_to(new_admin_question_broadcast_path)
            follow_redirect!
            expect(response.body).to include("見つかりません")
          end

          it "broadcastは行われない" do
            expect do
              post "/admin/question_broadcasts", params: { question_id: "" }
            end.not_to have_broadcasted_to("scoreboard")
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

          it "scoreboardチャンネルにbroadcastが行われる" do
            expect do
              post "/admin/question_broadcasts",
                   params: { question_id: question.id },
                   headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                   as: :json
            end.to have_broadcasted_to("scoreboard")
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

            it "broadcastは行われない" do
              expect do
                post "/admin/question_broadcasts",
                     params: { question_id: 999999 },
                     headers: { "Accept" => "application/json", "Content-Type" => "application/json" },
                     as: :json
              end.not_to have_broadcasted_to("scoreboard")
            end
          end
        end
      end
    end

    describe "POST /admin/question_broadcasts/sample" do
      let(:sample_text) { "サンプル問題文です" }
      let(:sample_answer) { "サンプル答え" }

      it "scoreboardチャンネルにbroadcastが行われる" do
        expect do
          post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        end.to have_broadcasted_to("scoreboard")
      end

      it "broadcast内容に入力したテキストが含まれる" do
        expect do
          post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include("turbo-stream")
          expect(data).to include('action="replace_question"')
          expect(data).to include('target="question"')
          expect(data).to include(sample_text)
          expect(data).to include(sample_answer)
        end)
      end

      it "サンプルテキスト送出後、リダイレクトする" do
        post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        expect(response).to redirect_to(new_admin_question_broadcast_path)
      end

      it "成功メッセージがflashに設定される" do
        post "/admin/question_broadcasts/sample", params: { text: sample_text, answer: sample_answer }
        follow_redirect!
        expect(response.body).to include("サンプルテキストを送出しました")
      end

      context "テキストが空の場合" do
        it "broadcastが行われてリダイレクトする" do
          post "/admin/question_broadcasts/sample", params: { text: "", answer: "" }
          expect(response).to redirect_to(new_admin_question_broadcast_path)
        end

        it "broadcastが行われる" do
          expect do
            post "/admin/question_broadcasts/sample", params: { text: "", answer: "" }
          end.to have_broadcasted_to("scoreboard")
        end
      end
    end

    describe "POST /admin/question_broadcasts/clear" do
      it "scoreboardチャンネルにbroadcastが行われる" do
        expect do
          post "/admin/question_broadcasts/clear"
        end.to have_broadcasted_to("scoreboard")
      end

      it "broadcast内容にturbo_stream replace_question（空テンプレート）が含まれる" do
        expect do
          post "/admin/question_broadcasts/clear"
        end.to(have_broadcasted_to("scoreboard").with do |data|
          expect(data).to include("turbo-stream")
          expect(data).to include('action="replace_question"')
          expect(data).to include('target="question"')
          expect(data).to include("<template></template>")
        end)
      end

      it "問題消去後、リダイレクトする" do
        post "/admin/question_broadcasts/clear"
        expect(response).to redirect_to(new_admin_question_broadcast_path)
      end

      it "成功メッセージがflashに設定される" do
        post "/admin/question_broadcasts/clear"
        follow_redirect!
        expect(response.body).to include("消去しました")
      end
    end
  end
end

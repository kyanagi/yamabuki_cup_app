require "rails_helper"

RSpec.describe "PUT /home/round3_course_preference", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }
  let(:session) { create(:session, player:) }
  let(:matches) { create_list(:match, 4, round: Round::ROUND3) }
  let!(:round3_course_preference) do
    create(
      :round3_course_preference,
      player:,
      choice1_match: matches[0],
      choice2_match: matches[1],
      choice3_match: matches[2],
      choice4_match: matches[3]
    )
  end

  context "ログイン時" do
    before do
      post session_path, params: { email: credential.email, password: "password" }
    end

    context "正常なパラメータの場合" do
      let(:params) do
        {
          round3_course_preference: {
            choice1_match_id: matches[1].id,
            choice2_match_id: matches[0].id,
            choice3_match_id: matches[3].id,
            choice4_match_id: matches[2].id,
          },
        }
      end

      it "コース選択希望が更新されること" do
        expect do
          subject
        end.to change { round3_course_preference.reload.choices }.to([matches[1], matches[0], matches[3], matches[2]])
      end

      it "フラッシュメッセージが表示されること" do
        subject
        expect(flash[:notice]).to eq "コース選択希望を更新しました。"
      end

      it "showページにリダイレクトされること" do
        subject
        expect(response).to redirect_to(home_round3_course_preference_path)
      end
    end

    context "重複したコースを選択した場合" do
      let(:params) do
        {
          round3_course_preference: {
            choice1_match_id: matches[0].id,
            choice2_match_id: matches[0].id,
            choice3_match_id: matches[2].id,
            choice4_match_id: matches[3].id,
          },
        }
      end

      it "コース選択希望が更新されないこと" do
        expect do
          subject
        end.not_to(change { round3_course_preference.reload.choices })
      end

      it "エラーメッセージが表示されること" do
        subject
        expect(response.body).to include "選択したコースに重複があります"
      end

      it "422ステータスが返されること" do
        subject
        expect(response).to have_http_status(422)
      end
    end

    context "コース選択希望が編集不可の場合" do
      before do
        Setting.update!(round3_course_preference_editable: false)
      end

      it "422ステータスが返されること" do
        subject
        expect(response).to have_http_status(422)
      end

      it "コース選択希望が更新されないこと" do
        expect do
          subject
        end.not_to(change { round3_course_preference.reload.choices })
      end
    end
  end

  context "未ログインの場合" do
    it "ログインページにリダイレクトされること" do
      subject
      expect(response).to redirect_to(new_session_path)
    end
  end
end

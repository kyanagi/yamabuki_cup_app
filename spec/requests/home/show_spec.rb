require "rails_helper"

RSpec.describe "GET /home", type: :request do
  let(:player) { create(:player) }
  let(:credential) { create(:player_email_credential, player:, password: "password", password_confirmation: "password") }

  before do
    Setting.update!(result_visible_on_mypage: true)
    create(:player_profile, player:)
    post session_path, params: { email: credential.email, password: "password" }
  end

  context "成績表示設定がOFFの場合" do
    before do
      Setting.update!(result_visible_on_mypage: false)
      create(:yontaku_player_result, player:, rank: 7)

      match = create(:match, round: Round::ROUND2, name: "表 第1組", match_number: 1, rule_name: "MatchRule::Round2Omote")
      create(:matching, match:, player:)
    end

    it "成績カードを表示しない" do
      get home_path

      expect(response).to have_http_status(:ok)
      expect(response.body).not_to include("成績")
      expect(response.body).not_to include(%Q(<span class="mypage-info-label">1R</span>))
      expect(response.body).not_to include(%Q(<span class="mypage-info-label">2R</span>))
      expect(response.body).not_to include("2R表 第1組")
    end
  end

  context "成績表示設定がONの場合" do
    before do
      Setting.update!(result_visible_on_mypage: true)
    end

    context "1R順位がある場合" do
      before do
        create(:yontaku_player_result, player:, rank: 7)
      end

      it "1Rの順位を表示する" do
        get home_path

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("成績")
        expect(response.body).to include(%Q(<span class="mypage-info-label">1R</span>))
        expect(response.body).to include(%Q(<span class="mypage-info-value">7位</span>))
        expect(response.body).not_to include(%Q(<span class="mypage-info-value">12位</span>))
      end
    end

    context "1R順位がない場合" do
      it "1Rの順位を空欄で表示する" do
        get home_path

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("成績")
        expect(response.body).to include(%Q(<span class="mypage-info-label">1R</span>))
        expect(response.body).not_to include(%Q(<span class="mypage-info-value">位</span>))
        expect(response.body).not_to include(%Q(<span class="mypage-info-value">12位</span>))
      end
    end

    context "2Rマッチングがある場合" do
      before do
        match = create(:match, round: Round::ROUND2, name: "表 第1組", match_number: 1, rule_name: "MatchRule::Round2Omote")
        create(:matching, match:, player:)
      end

      it "2R組分けを表示する" do
        get home_path

        expect(response).to have_http_status(:ok)
        expect(response.body).to include(%Q(<span class="mypage-info-label">2R</span>))
        expect(response.body).to include("2R表 第1組")
      end
    end

    context "2R組分けが未実施の場合" do
      it "2R組分けを表示しない" do
        get home_path

        expect(response).to have_http_status(:ok)
        expect(response.body).not_to include(%Q(<span class="mypage-info-label">2R</span>))
      end
    end

    context "2R組分け実施後で2Rシード対象の場合" do
      before do
        create_round2_done_state
        create(:yontaku_player_result, player:, rank: 1)
      end

      it "2Rシード文言を表示する" do
        get home_path

        expect(response).to have_http_status(:ok)
        expect(response.body).to include(%Q(<span class="mypage-info-label">2R</span>))
        expect(response.body).to include("2Rシード（2R参加なし）")
      end
    end

    context "2R組分け実施後で非シードかつ2Rマッチングなしの場合" do
      before do
        create_round2_done_state
        create(:yontaku_player_result, player:, rank: 20)
      end

      it "2R組分けを表示しない" do
        get home_path

        expect(response).to have_http_status(:ok)
        expect(response.body).not_to include(%Q(<span class="mypage-info-label">2R</span>))
      end
    end
  end

  private

  def create_round2_done_state
    match = create(:match, round: Round::ROUND2, name: "表 第1組", match_number: 1, rule_name: "MatchRule::Round2Omote")
    participant = create(:player)
    create(:matching, match:, player: participant, seat: 0)
    MatchOpening.create!(match:)
  end
end

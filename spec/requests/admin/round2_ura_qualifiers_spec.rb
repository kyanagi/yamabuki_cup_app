require "rails_helper"

RSpec.describe "Admin::Round2UraQualifiers", type: :request do
  def create_round2_ura_match_with_participants(count: 12)
    match = create(:match, rule_name: "MatchRule::Round2Ura")
    matchings = count.times.map do |i|
      create(:matching, match: match, seat: i + 1)
    end
    MatchOpening.create!(match: match)
    [match.reload, matchings]
  end

  def login_as(admin_user)
    post admin_session_path, params: { username: admin_user.username, password: "password123" }
  end

  describe "GET /admin/matches/:match_id/round2_ura_qualifier/edit" do
    context "adminユーザーとしてログイン済みの場合" do
      let(:admin_user) { create(:admin_user, role: :admin) }

      before { login_as(admin_user) }

      it "200を返す" do
        match, _matchings = create_round2_ura_match_with_participants
        get edit_admin_match_round2_ura_qualifier_path(match_id: match.id)
        expect(response).to have_http_status(:ok)
      end

      it "参加者の一覧が表示される" do
        match, matchings = create_round2_ura_match_with_participants
        create(:player_profile, player: matchings[0].player)

        get edit_admin_match_round2_ura_qualifier_path(match_id: match.id)

        expect(response.body).to include(matchings[0].player.player_profile.entry_list_name)
      end
    end

    context "staffユーザーとしてログイン済みの場合" do
      let(:staff_user) { create(:admin_user, role: :staff) }

      before { login_as(staff_user) }

      it "200を返す" do
        match, _matchings = create_round2_ura_match_with_participants
        get edit_admin_match_round2_ura_qualifier_path(match_id: match.id)
        expect(response).to have_http_status(:ok)
      end
    end

    context "未ログインの場合" do
      it "ログインページにリダイレクトされる" do
        match, _matchings = create_round2_ura_match_with_participants
        get edit_admin_match_round2_ura_qualifier_path(match_id: match.id)
        expect(response).to redirect_to(new_admin_session_path)
      end
    end
  end

  describe "PATCH /admin/matches/:match_id/round2_ura_qualifier" do
    context "adminユーザーとしてログイン済みの場合" do
      let(:admin_user) { create(:admin_user, role: :admin) }

      before { login_as(admin_user) }

      context "有効なパラメータの場合" do
        it "Round2UraQualifierUpdateが作成される" do
          match, matchings = create_round2_ura_match_with_participants

          params = {
            round2_ura_qualifier_input: {
              rank_by_matching_id: {
                matchings[0].id.to_s => "1",
                matchings[1].id.to_s => "2",
                matchings[2].id.to_s => "3",
                matchings[3].id.to_s => "4",
              },
            },
          }

          expect do
            patch admin_match_round2_ura_qualifier_path(match_id: match.id), params: params
          end.to change(Round2UraQualifierUpdate, :count).by(1)
        end

        it "edit画面にリダイレクトされる" do
          match, matchings = create_round2_ura_match_with_participants

          params = {
            round2_ura_qualifier_input: {
              rank_by_matching_id: {
                matchings[0].id.to_s => "1",
                matchings[1].id.to_s => "2",
                matchings[2].id.to_s => "3",
                matchings[3].id.to_s => "4",
              },
            },
          }

          patch admin_match_round2_ura_qualifier_path(match_id: match.id), params: params
          expect(response).to redirect_to(edit_admin_match_round2_ura_qualifier_path(match_id: match.id))
        end
      end

      context "無効なパラメータの場合（3名のみ指定）" do
        it "422が返される" do
          match, matchings = create_round2_ura_match_with_participants

          params = {
            round2_ura_qualifier_input: {
              rank_by_matching_id: {
                matchings[0].id.to_s => "1",
                matchings[1].id.to_s => "2",
                matchings[2].id.to_s => "3",
              },
            },
          }

          patch admin_match_round2_ura_qualifier_path(match_id: match.id), params: params
          expect(response).to have_http_status(:unprocessable_entity)
        end

        it "エラーメッセージが表示される" do
          match, matchings = create_round2_ura_match_with_participants

          params = {
            round2_ura_qualifier_input: {
              rank_by_matching_id: {
                matchings[0].id.to_s => "1",
                matchings[1].id.to_s => "2",
                matchings[2].id.to_s => "3",
              },
            },
          }

          patch admin_match_round2_ura_qualifier_path(match_id: match.id), params: params
          expect(response.body).to include("勝抜け者はちょうど4名")
        end
      end
    end

    context "staffユーザーとしてログイン済みの場合" do
      let(:staff_user) { create(:admin_user, role: :staff) }

      before { login_as(staff_user) }

      it "有効なパラメータで保存できる" do
        match, matchings = create_round2_ura_match_with_participants

        params = {
          round2_ura_qualifier_input: {
            rank_by_matching_id: {
              matchings[0].id.to_s => "1",
              matchings[1].id.to_s => "2",
              matchings[2].id.to_s => "3",
              matchings[3].id.to_s => "4",
            },
          },
        }

        expect do
          patch admin_match_round2_ura_qualifier_path(match_id: match.id), params: params
        end.to change(Round2UraQualifierUpdate, :count).by(1)
      end
    end
  end
end

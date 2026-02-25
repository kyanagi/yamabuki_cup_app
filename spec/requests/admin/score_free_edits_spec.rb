require "rails_helper"

RSpec.describe "Admin::ScoreFreeEdits", type: :request do
  def create_match_with_participants(rule_name:, count: nil)
    rule_class = rule_name.constantize
    match = create(:match, rule_name: rule_name)
    matchings = (count || rule_class::NUM_SEATS).times.map do |i|
      matching = create(:matching, match: match, seat: i + 1)
      create(:player_profile, player: matching.player)
      matching
    end
    MatchOpening.create!(match: match)
    [match.reload, matchings]
  end

  def score_free_edit_params_from(match, matchings)
    editable_fields = ScoreFreeEditInput.editable_fields_for(match.rule_class)
    current_scores = match.current_scores.index_by(&:matching_id)

    {
      score_free_edit_input: {
        scores_by_matching_id: matchings.each_with_object({}) do |matching, hash|
          score = current_scores.fetch(matching.id)
          attrs = {}
          attrs[:status] = score.status if editable_fields.include?(:status)
          attrs[:points] = score.points.to_s if editable_fields.include?(:points)
          attrs[:misses] = score.misses.to_s if editable_fields.include?(:misses)
          attrs[:rank] = score.rank&.to_s if editable_fields.include?(:rank)
          attrs[:stars] = score.stars.to_s if editable_fields.include?(:stars)
          hash[matching.id.to_s] = attrs
        end,
      },
    }
  end

  def login_as(admin_user)
    post admin_session_path, params: { username: admin_user.username, password: "password123" }
  end

  describe "GET /admin/matches/:match_id/score_free_edit/edit" do
    context "adminユーザーとしてログイン済みの場合" do
      let(:admin_user) { create(:admin_user, role: :admin) }

      before { login_as(admin_user) }

      [
        "MatchRule::Round2Omote",
        "MatchRule::Round3Hayaoshi71",
        "MatchRule::Round3Hayaoshi73",
        "MatchRule::Quarterfinal",
        "MatchRule::Round3Hayabo",
        "MatchRule::Round3Hayabo2",
        "MatchRule::Semifinal",
        "MatchRule::Playoff",
        "MatchRule::Final",
      ].each do |rule_name|
        it "#{rule_name} で200を返す" do
          match, = create_match_with_participants(rule_name: rule_name)

          get edit_admin_match_score_free_edit_path(match_id: match.id)

          expect(response).to have_http_status(:ok)
        end
      end
    end

    context "staffユーザーとしてログイン済みの場合" do
      let(:staff_user) { create(:admin_user, role: :staff) }

      before { login_as(staff_user) }

      it "2R表で200を返す" do
        match, = create_match_with_participants(rule_name: "MatchRule::Round2Omote")

        get edit_admin_match_score_free_edit_path(match_id: match.id)

        expect(response).to have_http_status(:ok)
      end
    end

    context "未ログインの場合" do
      it "ログインページにリダイレクトされる" do
        match, = create_match_with_participants(rule_name: "MatchRule::Round2Omote")

        get edit_admin_match_score_free_edit_path(match_id: match.id)

        expect(response).to redirect_to(new_admin_session_path)
      end
    end

    context "2R裏の場合" do
      let(:admin_user) { create(:admin_user, role: :admin) }

      before { login_as(admin_user) }

      it "422を返す" do
        match, = create_match_with_participants(rule_name: "MatchRule::Round2Ura")

        get edit_admin_match_score_free_edit_path(match_id: match.id)

        expect(response).to have_http_status(:unprocessable_content)
      end
    end
  end

  describe "PATCH /admin/matches/:match_id/score_free_edit" do
    let(:admin_user) { create(:admin_user, role: :admin) }

    before { login_as(admin_user) }

    [
      "MatchRule::Round2Omote",
      "MatchRule::Round3Hayaoshi71",
      "MatchRule::Round3Hayaoshi73",
      "MatchRule::Quarterfinal",
      "MatchRule::Round3Hayabo",
      "MatchRule::Round3Hayabo2",
      "MatchRule::Semifinal",
      "MatchRule::Playoff",
      "MatchRule::Final",
    ].each do |rule_name|
      it "#{rule_name} の有効な入力でScoreFreeEditOperationが作成される" do
        match, matchings = create_match_with_participants(rule_name: rule_name)

        expect do
          patch admin_match_score_free_edit_path(match_id: match.id),
                params: score_free_edit_params_from(match, matchings)
        end.to change(ScoreFreeEditOperation, :count).by(1)
      end
    end

    it "無効なstatusなら422を返す" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Quarterfinal")
      params = score_free_edit_params_from(match, matchings)
      params[:score_free_edit_input][:scores_by_matching_id][matchings.first.id.to_s][:status] = "lose"

      patch admin_match_score_free_edit_path(match_id: match.id), params: params

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.body).to include("status")
    end

    it "Finalでstarsを更新できる" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Final")
      params = score_free_edit_params_from(match, matchings)
      params[:score_free_edit_input][:scores_by_matching_id][matchings.first.id.to_s][:stars] = "5"

      patch admin_match_score_free_edit_path(match_id: match.id), params: params

      expect(response).to redirect_to(edit_admin_match_score_free_edit_path(match_id: match.id))
      saved_score = match.reload.last_score_operation.scores.find_by!(matching: matchings.first)
      expect(saved_score.stars).to eq(5)
    end

    it "2R裏は422を返し、保存しない" do
      match, matchings = create_match_with_participants(rule_name: "MatchRule::Round2Ura")

      expect do
        patch admin_match_score_free_edit_path(match_id: match.id),
              params: score_free_edit_params_from(match, matchings)
      end.not_to change(ScoreFreeEditOperation, :count)

      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end

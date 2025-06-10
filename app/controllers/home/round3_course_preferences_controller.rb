module Home
  class Round3CoursePreferencesController < PublicController
    def show
      @preference = Current.session.player.round3_course_preference
    end

    def update
      @preference = Current.session.player.round3_course_preference
      if @preference.update(preference_params)
        flash.notice = "コース選択希望を更新しました。"
        redirect_to home_round3_course_preference_path
      else
        render :show, status: :unprocessable_entity
      end
    end

    private

    def preference_params
      params.expect(round3_course_preference: [
        :choice1_match_id,
        :choice2_match_id,
        :choice3_match_id,
        :choice4_match_id,
      ])
    end
  end
end

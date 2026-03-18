module Admin
  class SettingsController < AdminController
    def show
    end

    def update
      Setting.update!(setting_params)
      flash.notice = "設定を更新しました"
      redirect_to admin_settings_path
    rescue ArgumentError => e
      flash.now.alert = e.message
      render :show, status: 422
    end

    private

    def setting_params
      {
        round3_course_preference_editable: params[:round3_course_preference_editable].present?,
        result_visible_on_mypage: params[:result_visible_on_mypage].present?,
        capacity: params[:capacity],
        entry_phase: params[:entry_phase].presence,
      }
    end
  end
end

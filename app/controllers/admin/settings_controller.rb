module Admin
  class SettingsController < AdminController
    def show
    end

    def update
      Setting.update!(setting_params)
      flash.notice = "設定を更新しました"
      redirect_to admin_settings_path
    end

    private

    def setting_params
      {
        registerable: params[:registerable],
        round3_course_preference_editable: params[:round3_course_preference_editable],
      }
    end
  end
end

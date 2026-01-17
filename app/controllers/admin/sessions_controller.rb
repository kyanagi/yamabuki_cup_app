module Admin
  class SessionsController < AdminController
    allow_unauthenticated_admin_access only: [:new, :create]

    def new
    end

    def create
      admin_user = AdminUser.authenticate_by(username: params[:username], password: params[:password])
      if admin_user
        start_new_admin_session_for(admin_user)
        redirect_to after_admin_authentication_url
      else
        flash.now.alert = "ユーザー名またはパスワードが正しくありません。"
        render :new, status: 422
      end
    end

    def destroy
      terminate_admin_session
      redirect_to new_admin_session_path
    end
  end
end

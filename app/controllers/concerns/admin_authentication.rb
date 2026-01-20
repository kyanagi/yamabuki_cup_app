module AdminAuthentication
  extend ActiveSupport::Concern

  included do
    before_action :require_admin_authentication
    helper_method :admin_authenticated?
  end

  class_methods do
    def allow_unauthenticated_admin_access(**)
      skip_before_action(:require_admin_authentication, **)
    end

    # 認可（Authorization）
    # スタッフ不可、管理者のみアクセス可能にする
    def require_admin_role
      before_action :authorize_admin_only
    end
  end

  private

  def admin_authenticated?
    resume_admin_session
  end

  def require_admin_authentication
    resume_admin_session || request_admin_authentication
  end

  def resume_admin_session
    Current.admin_session ||= find_admin_session_by_cookie
  end

  def find_admin_session_by_cookie
    AdminSession.find_by(id: cookies.signed[:admin_session_id]) if cookies.signed[:admin_session_id]
  end

  def request_admin_authentication
    session[:return_to_after_admin_authenticating] = request.fullpath
    redirect_to new_admin_session_path
  end

  def after_admin_authentication_url
    session.delete(:return_to_after_admin_authenticating) || admin_root_path
  end

  def start_new_admin_session_for(admin_user)
    admin_user.admin_sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |admin_session|
      Current.admin_session = admin_session
      cookies.signed.permanent[:admin_session_id] = {
        value: admin_session.id,
        httponly: true,
        secure: Rails.env.production?,
        same_site: :lax,
        path: "/admin",
        expires: 2.weeks.from_now,
      }
    end
  end

  def terminate_admin_session
    Current.admin_session&.destroy
    cookies.delete(:admin_session_id, path: "/admin")
  end

  # 認可: 管理者のみ許可（スタッフは不可）
  def authorize_admin_only
    return if Current.admin_user&.admin?

    respond_to do |format|
      format.html do
        render plain: "この操作を行う権限がありません。", status: 403
      end
      format.turbo_stream { head 403 }
      format.json { render json: { error: "Forbidden" }, status: 403 }
    end
  end
end

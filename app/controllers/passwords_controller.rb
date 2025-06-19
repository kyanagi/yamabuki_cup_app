class PasswordsController < ApplicationController
  before_action :set_credential_by_token, only: [:edit, :update]

  def new
  end

  def edit
  end

  def create
    credential = PlayerEmailCredential.find_by(email: params[:email])
    if credential
      PasswordsMailer.reset(credential).deliver_later
    end

    session[:password_reset_requested] = true
    redirect_to created_passwords_path
  end

  def created
    if !session.delete(:password_reset_requested)
      redirect_to new_password_path
    end
  end

  def update
    if @credential.update(params.permit(:password, :password_confirmation))
      redirect_to new_session_path, notice: "パスワードが更新されました。新しいパスワードでログインしてください。"
    else
      redirect_to edit_password_path(params[:token]), alert: "パスワードが一致しません。"
    end
  end

  private

  def set_credential_by_token
    @credential = PlayerEmailCredential.find_by_password_reset_token!(params[:token])
  rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
    redirect_to new_password_path, alert: "パスワード再設定リンクが無効か期限切れです。"
  end
end

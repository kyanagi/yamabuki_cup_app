class SessionsController < PublicController
  allow_unauthenticated_access only: [:new, :create]
  before_action :resume_session

  def new
  end

  def create
    credential = PlayerEmailCredential.authenticate_by(email: params[:email], password: params[:password])
    if credential
      start_new_session_for(credential.player)
      redirect_to after_authentication_url
    else
      flash.now.alert = "メールアドレスまたはパスワードが正しくありません。"
      render :new, status: :unprocessable_entity
    end
  end

  def destroy
    terminate_session
    redirect_to root_path
  end
end

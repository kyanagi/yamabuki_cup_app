class SessionsController < PublicController
  allow_unauthenticated_access
  before_action :resume_session

  def destroy
    terminate_session
    redirect_to root_path
  end
end

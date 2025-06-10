class HomeController < PublicController
  def show
    if session[:registration_completed]
      session.delete(:registration_completed)
      render :registration_completed
    end
  end
end

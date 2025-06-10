class RegistrationsController < PublicController
  allow_unauthenticated_access

  def new
    @registration = Registration.new
  end

  def create
    @registration = Registration.new(registration_params)
    if @registration.save
      start_new_session_for(@registration.player)
      session[:registration_completed] = true
      redirect_to home_path
    else
      render :new, status: :unprocessable_entity
    end
  end

  private

  def registration_params
    params.expect(registration: [
      :email,
      :password,
      :family_name,
      :given_name,
      :family_name_kana,
      :given_name_kana,
      :entry_list_name,
      :notes,
    ])
  end
end

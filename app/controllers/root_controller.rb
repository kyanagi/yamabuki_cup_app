class RootController < PublicController
  allow_unauthenticated_access
  before_action :resume_session

  def show
    current_player = Current.session&.player

    @message = if current_player
                 "logged in as player id=#{current_player.id}."
               else
                 "not logged in."
               end
  end
end

module Home
  class PlayerProfilesController < PublicController
    def edit
      @player_profile_edit = PlayerProfileEdit.new(player_id: current_player.id)
    end

    def update
      @player_profile_edit = PlayerProfileEdit.new(player_profile_edit_params.merge(player_id: current_player.id))

      if @player_profile_edit.save
        flash.notice = "エントリー内容を更新しました"
        redirect_to edit_home_player_profile_path
      else
        render :edit, status: :unprocessable_entity
      end
    end

    private

    def current_player
      Current.session.player
    end

    def player_profile_edit_params
      params.require(:player_profile_edit).permit(
        :player_id, :email, :password, :family_name, :given_name,
        :family_name_kana, :given_name_kana, :entry_list_name
      )
    end
  end
end

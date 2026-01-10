module Admin
  module Round1
    class PlayersController < AdminController
      def show
        player = Player.find_by(id: params[:id])
        if player
          render json: { name: player.player_profile&.full_name }
        else
          render json: { name: nil }, status: 404
        end
      end
    end
  end
end

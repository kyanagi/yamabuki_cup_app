module Admin
  class MatchmakingsController < AdminController
    def create
      ActiveRecord::Base.transaction do
        @round = Round.find(params[:round_id])
        @matchmaking = @round.matchmaking_class.new
        if @matchmaking.save
          flash.now.notice = "組分け処理を行いました。"
        else
          flash.now.alert = @matchmaking.errors.full_messages.join(", ")
        end
      end
    rescue => e
      flash.now.alert = e.message
    end
  end
end

module Admin
  module Round1
    class ResultsController < ApplicationController
      def index
        @results = YontakuPlayerResult.preload(player: :player_profile).order(:rank)
      end
    end
  end
end

module Admin
  module Round1
    class ResultsController < AdminController
      def index
        @players = Player
          .preload(:yontaku_player_papers)
          .eager_load(:approximation_quiz_answer, :yontaku_player_result, :player_profile)
          .sort_by do
            [it.yontaku_player_result&.rank || Float::INFINITY, it.id]
          end
      end
    end
  end
end

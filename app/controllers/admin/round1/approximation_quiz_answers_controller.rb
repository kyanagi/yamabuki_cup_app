module Admin
  module Round1
    class ApproximationQuizAnswersController < AdminController
      def index
        @players = Player.eager_load(:player_profile, :approximation_quiz_answer).order(:id)
      end

      def new
        @approximation_quiz_answer = ApproximationQuizAnswer.new

        players = Player.eager_load(:player_profile, :approximation_quiz_answer)
        @submitted_players = players.joins(:approximation_quiz_answer).order("approximation_quiz_answers.created_at DESC")
        @unsubmitted_players = players.where.missing(:approximation_quiz_answer).order(:id)
      end

      def create
        @approximation_quiz_answer = ApproximationQuizAnswer.new(params.expect(approximation_quiz_answer: [:player_id, :answer1, :answer2]))

        ApproximationQuizAnswer.transaction do
          existing_answer = ApproximationQuizAnswer.find_by(player_id: @approximation_quiz_answer.player_id)
          existing_answer&.destroy!

          if @approximation_quiz_answer.save
            if existing_answer
              flash.notice = "【上書き】近似値を上書きしました。ID=#{@approximation_quiz_answer.player_id}"
            else
              flash.notice = "近似値を入力しました。ID=#{@approximation_quiz_answer.player_id}"
            end
          else
            flash.alert = "エラーが発生しました。" + @approximation_quiz_answer.errors.full_messages.join(", ")
          end
          redirect_to new_admin_round1_approximation_quiz_answer_path
        end
      end
    end
  end
end

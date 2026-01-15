module Admin
  class QuestionBroadcastsController < AdminController
    def new
    end

    def create
      question = Question.find_by(id: params[:question_id])

      if question.nil?
        redirect_to new_admin_question_broadcast_path,
                    alert: "Question ID=#{params[:question_id]} が見つかりません"
        return
      end

      broadcast_question_board(question)
      redirect_to new_admin_question_broadcast_path,
                  notice: "Question ID=#{question.id} を送出しました"
    end

    private

    def broadcast_question_board(question)
      ActionCable.server.broadcast(
        "scoreboard",
        turbo_stream.update("question") { render_to_string(partial: "scoreboard/question/question", locals: { question: }) }
      )
    end
  end
end

module Admin
  class QuestionBroadcastsController < AdminController
    def new
    end

    def create
      question = Question.find_by(id: params[:question_id])

      if question.nil?
        respond_to do |format|
          format.html do
            redirect_to new_admin_question_broadcast_path,
                        alert: "Question ID=#{params[:question_id]} が見つかりません"
          end
          format.json { render json: { error: "Question not found" }, status: 404 }
        end
        return
      end

      broadcast_question_board(question)

      respond_to do |format|
        format.html do
          redirect_to new_admin_question_broadcast_path,
                      notice: "Question ID=#{question.id} を送出しました"
        end
        format.json { render json: { success: true, question_id: question.id }, status: 200 }
      end
    end

    def clear
      clear_question_board
      redirect_to new_admin_question_broadcast_path, notice: "問題を消去しました"
    end

    private

    def broadcast_question_board(question)
      html = render_to_string(partial: "scoreboard/question/question", locals: { question: }, formats: [:html])
      ActionCable.server.broadcast(
        "scoreboard",
        %Q(<turbo-stream action="replace_question" target="question"><template>#{html}</template></turbo-stream>)
      )
    end

    def clear_question_board
      ActionCable.server.broadcast(
        "scoreboard",
        '<turbo-stream action="replace_question" target="question"><template></template></turbo-stream>'
      )
    end
  end
end

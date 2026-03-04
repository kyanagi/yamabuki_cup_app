module Admin
  class QuestionBroadcastsController < AdminController
    require_admin_role

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

      broadcast_question_board(question, read_duration: params[:read_duration])

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

    def sample
      text = params[:text].to_s
      answer = params[:answer].to_s
      sample_question = Question.new(text:, answer:)
      broadcast_question_board(sample_question)
      redirect_to new_admin_question_broadcast_path, notice: "サンプルテキストを送出しました"
    end

    private

    def broadcast_question_board(question, read_duration: nil)
      split = question.split_text_at(read_duration)
      ActiveSupport::Notifications.instrument("scoreboard.question_show",
                                              payload: {
                                                text: question.text,
                                                answer: question.answer,
                                                read_text: split[:read_text],
                                                unread_text: split[:unread_text],
                                              })
    end

    def clear_question_board
      ActiveSupport::Notifications.instrument("scoreboard.question_clear")
    end
  end
end

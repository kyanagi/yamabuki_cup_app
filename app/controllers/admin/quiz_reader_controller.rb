module Admin
  class QuizReaderController < AdminController
    require_admin_role
    layout "admin/quiz_reader"

    def show
      @next_question, @next2_question = QuestionProvider.next_questions
      @reading_histories = QuestionReading.order(created_at: :desc).limit(5).preload(:question)
    end
  end
end

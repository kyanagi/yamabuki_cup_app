module Admin
  class QuizReaderController < ApplicationController
    def show
      @next_question, @next2_question = QuestionProvider.next_questions
      @reading_histories = QuestionReading.order(created_at: :desc).limit(5).preload(:question)
    end
  end
end

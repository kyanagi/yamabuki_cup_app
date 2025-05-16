module Admin
  class QuizReaderController < ApplicationController
    def show
      @next_question, @next2_question = QuestionProvider.next_questions
    end
  end
end

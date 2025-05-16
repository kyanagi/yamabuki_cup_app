module Admin
  class QuizReaderController < ApplicationController
    def show
      # TODO
      questions = Question.all.shuffle
      @next_question = questions[0]
      @next2_question = questions[1]
    end
  end
end

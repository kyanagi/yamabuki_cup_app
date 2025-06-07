module Admin
  class CurrentQuestionController < AdminController
    def show
      # TODO
      question = Question.first
      render :show, locals: { question: question }
    end

    def update
      # TODO
      question = Question.first
      render :show, locals: { question: question }
    end
  end
end

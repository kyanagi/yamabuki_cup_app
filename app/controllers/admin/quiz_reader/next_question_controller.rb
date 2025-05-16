module Admin
  module QuizReader
    class NextQuestionController < ApplicationController
      def update
        provider = QuestionProvider.first
        provider.update(next_question: Question.find(params[:question_id]))
        render json: { next_question_id: provider.next_question_id }
      end
    end
  end
end

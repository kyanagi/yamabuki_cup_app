module Admin
  module QuizReader
    class NextQuestionController < ApplicationController
      def update
        provider = QuestionProvider.first!
        case params[:question_id]
        when "next"
          provider.proceed_to_next_question!
        else
          provider.update!(next_question: Question.find(params[:question_id]))
        end

        @next_question, @next2_question = provider.next_questions
      end
    end
  end
end

module Admin
  module QuizReader
    class QuestionReadingsController < ApplicationController
      def create
        render json: { result: "OK" }
      end
    end
  end
end

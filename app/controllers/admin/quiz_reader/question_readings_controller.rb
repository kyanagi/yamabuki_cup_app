module Admin
  module QuizReader
    class QuestionReadingsController < ApplicationController
      def create
        r = QuestionReading.create!(params.expect(question_reading: [:question_id, :read_duration, :full_duration]))
        render json: r
      end
    end
  end
end

module Admin
  module Round1
    class PaperQuizGradingsController < ApplicationController
      def create
        ActiveRecord::Base.transaction do
          PaperQuizGrading.create!
        end
        redirect_to admin_round1_results_path
      end
    end
  end
end

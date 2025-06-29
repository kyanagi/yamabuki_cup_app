module Admin
  class QuestionClosingsController < AdminController
    include MatchInstanceVariables

    def create
      match = nil
      question = nil
      ActiveRecord::Base.transaction do
        match = Match
          .preload(last_score_operation: { scores: :matching })
          .find(params[:match_id])
        qc = QuestionClosing.create!(match:, question_player_results_attributes: create_params)
        question = qc.question
      end

      broadcast_scoreboard(match)
      broadcast_question_board(question) if question
      setup_instance_variables(match)
      render "admin/shared/matches/#{@match.rule_class::ADMIN_VIEW_TEMPLATE}/show"
    end

    private

    def create_params
      if params[:question_player_results_attributes].present?
        params.expect(question_player_results_attributes: [[:player_id, :situation, :result]])
      else
        []
      end
    end

    def broadcast_question_board(question)
      ActionCable.server.broadcast(
        "scoreboard",
        turbo_stream.update("question") { render_to_string(partial: "scoreboard/question/question", locals: { question: }) }
      )
    end
  end
end

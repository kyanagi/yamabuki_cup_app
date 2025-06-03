Rails.application.routes.draw do
  mount ActionCable.server => "/cable"

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  get "/scoreboard", to: "scoreboard#show"

  namespace :admin do
    get "quiz_reader", to: "quiz_reader#show"
    namespace :quiz_reader do
      put "next_question", to: "next_question#update"
      post "question_readings", to: "question_readings#create"
    end

    namespace :round1 do
      resources :results, only: [:index]
    end

    resources :matches, only: [:show] do
      post :question_closings, to: 'question_closings#create'
      post :match_closings, to: 'match_closings#create'
      post :undos, to: 'score_operation_undos#create'
    end
  end
end

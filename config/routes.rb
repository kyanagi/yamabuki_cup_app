Rails.application.routes.draw do
  mount ActionCable.server => "/cable"

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  root "root#show"

  get "/scoreboard", to: "scoreboard#show"

  get "/sbtest", to: "scoreboard#test"

  resources :registrations, only: [:new, :create]
  resource :session

  get "/home", to: "home#show"
  namespace :home do
    resource :round3_course_preference, only: [:show, :update]
  end

  namespace :admin do
    resource :settings, only: [:show, :update]

    get "quiz_reader", to: "quiz_reader#show"
    namespace :quiz_reader do
      put "next_question", to: "next_question#update"
      post "question_readings", to: "question_readings#create"
    end

    resources :scoreboard_manipulations, only: [:new, :create]

    namespace :round1 do
      get "timer", to: "timer#show"
      post "timer/display", to: "timer#display"
      post "timer/start", to: "timer#start"
      post "timer/stop", to: "timer#stop"
      patch "timer/remaining_time", to: "timer#update_remaining_time"
      resources :results, only: [:index]
      resources :yontaku_player_papers, only: [:create, :index] do
        collection do
          delete :destroy, to: "yontaku_player_papers#destroy_all"
        end
      end
      resources :approximation_quiz_answers, only: [:create, :new, :index]
      resources :paper_quiz_gradings, only: [:create]
    end

    resources :matches, only: [:show, :index] do
      post :question_closings, to: 'question_closings#create'
      post :set_transitions, to: 'set_transitions#create'
      post :disqualifications, to: 'disqualifications#create'
      post :match_closings, to: 'match_closings#create'
      post :undos, to: 'score_operation_undos#create'
    end

    resources :matchmakings, only: [:create]
  end
end

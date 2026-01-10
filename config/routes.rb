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
  resources :passwords, param: :token do
    get :created, on: :collection
  end

  get "/home", to: "home#show"
  namespace :home do
    resource :round3_course_preference, only: [:show, :update]
    resource :player_profile, only: [:edit, :update]
  end

  namespace :admin do
    root "dashboard#show"

    resource :settings, only: [:show, :update]

    get "quiz_reader", to: "quiz_reader#show"
    namespace :quiz_reader do
      put "next_question", to: "next_question#update"
      post "question_readings", to: "question_readings#create"
    end

    resources :scoreboard_manipulations, only: [:new, :create] do
      collection do
        get :round1_timer
        get :seed_announcement
        get :first_place_announcement
        get :round2_match1
        get :round2_match2
        get :round2_match3
        get :round2_match4
        get :round2_match5
        get :announcement
      end
    end

    get "round1", to: "round1#show"

    namespace :round1 do
      resources :results, only: [:index]
      resources :players, only: [:show]
      resources :yontaku_player_papers, only: [:create, :index] do
        collection do
          delete :destroy, to: "yontaku_player_papers#destroy_all"
        end
      end
      resources :approximation_quiz_answers, only: [:create, :new, :index, :show, :destroy]
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

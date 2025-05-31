Rails.application.routes.draw do
  mount ActionCable.server => "/cable"

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"

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
    namespace :round2 do
      get '/:match_number', to: 'matches#show'
      post '/:match_number/question_closings', to: 'question_closings#create'
      post '/:match_number/match_closings', to: 'match_closings#create'
      post '/:match_number/undos', to: 'undos#create'
    end
  end
end

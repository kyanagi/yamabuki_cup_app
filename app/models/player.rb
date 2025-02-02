class Player < ApplicationRecord
  has_one :yontaku_player_result, dependent: :destroy
  has_many :question_player_results, dependent: :destroy
  has_many :matchings, dependent: :destroy
end

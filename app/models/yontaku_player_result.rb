class YontakuPlayerResult < ApplicationRecord
  belongs_to :player

  scope :round3_seeded, -> { where(rank: 1..Matchmaking::Round2::NUM_SEED_PLAYERS) }
end

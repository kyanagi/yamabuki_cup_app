class YontakuPlayerResult < ApplicationRecord
  belongs_to :player

  scope :round2_seeded, -> { where(rank: 1..Matchmaking::Round2::NUM_SEED_PLAYERS) }
end

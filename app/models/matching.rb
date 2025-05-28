class Matching < ApplicationRecord
  belongs_to :match
  belongs_to :player
  has_many :scores, dependent: :destroy
end

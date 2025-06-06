class YontakuPlayerPaper < ApplicationRecord
  belongs_to :player

  validates :paper_number, presence: true
  validates :answers, presence: true
  validates :paper_number, uniqueness: { scope: :player_id }
end

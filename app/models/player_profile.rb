class PlayerProfile < ApplicationRecord
  belongs_to :player

  def full_name(spacer = " ")
    "#{family_name}#{spacer}#{given_name}"
  end
end

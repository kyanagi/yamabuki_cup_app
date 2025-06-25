class PlayerProfile < ApplicationRecord
  belongs_to :player

  def full_name(spacer = " ")
    "#{family_name}#{spacer}#{given_name}"
  end

  def full_name_kana(spacer = " ")
    "#{family_name_kana}#{spacer}#{given_name_kana}"
  end

  def scoreboard_full_name
    length_limit = 4
    if family_name.size + given_name.size >= length_limit
      family_name + given_name
    else
      family_name + ("\u3000" * (length_limit - (family_name.size + given_name.size))) + given_name
    end
  end
end

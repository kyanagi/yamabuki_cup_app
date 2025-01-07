# rubocop:disable Rails/HasManyOrHasOneDependent
class Round < ActiveHash::Base
  include ActiveHash::Associations

  has_many :matches

  self.data = [
    { id: 1, name: "1R" },
    { id: 2, name: "2R" },
    { id: 3, name: "3R" },
    { id: 4, name: "準々決勝" },
    { id: 5, name: "準決勝" },
    { id: 6, name: "決勝" },
  ]
end

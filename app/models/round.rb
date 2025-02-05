# rubocop:disable Rails/HasManyOrHasOneDependent
class Round < ActiveHash::Base
  include ActiveHash::Associations
  include ActiveHash::Enum

  has_many :matches

  enum_accessor :enum_name

  self.data = [
    { id: 1, name: "1R", enum_name: "round1" },
    { id: 2, name: "2R", enum_name: "round2" },
    { id: 3, name: "3R", enum_name: "round3" },
    { id: 4, name: "準々決勝", enum_name: "quarter_final" },
    { id: 5, name: "準決勝", enum_name: "semi_final" },
    { id: 6, name: "決勝", enum_name: "final" },
  ]

  def matchings
    Matching.joins(:match).where(match: { round_id: id })
  end
end

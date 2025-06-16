# rubocop:disable Rails/HasManyOrHasOneDependent
class Round < ActiveHash::Base
  include ActiveHash::Associations
  include ActiveHash::Enum

  has_many :matches

  enum_accessor :enum_name

  self.data = [
    { id: 1, name: "1R", enum_name: "round1", matchmaking_class: nil },
    { id: 2, name: "2R アドバンテージ付き3◯2×", enum_name: "round2", matchmaking_class: Matchmaking::Round2 },
    { id: 3, name: "3R", enum_name: "round3", matchmaking_class: Matchmaking::Round3 },
    { id: 4, name: "準々決勝 60問早押しクイズ", enum_name: "quarterfinal", matchmaking_class: Matchmaking::Quarterfinal },
    { id: 5, name: "準決勝 スーパーショックランド", enum_name: "semifinal", matchmaking_class: Matchmaking::Semifinal },
    { id: 6, name: "決勝 ななつぼし獲得クイズ", enum_name: "final", matchmaking_class: Matchmaking::Final },
  ]

  def matchings
    Matching.joins(:match).where(match: { round_id: id })
  end
end

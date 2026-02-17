# rubocop:disable Rails/HasManyOrHasOneDependent
class Round < ActiveHash::Base
  include ActiveHash::Associations
  include ActiveHash::Enum

  has_many :matches

  enum_accessor :enum_name

  self.data = [
    { id: 1, name: "1R 1時間クイズ", enum_name: "round1", matchmaking_class: nil },
    { id: 2, name: "2R 3◯2×クイズ", enum_name: "round2", matchmaking_class: Matchmaking::Round2 },
    { id: 3, name: "プレーオフ アタック風サバイバルクイズ", enum_name: "playoff", matchmaking_class: Matchmaking::Playoff },
    { id: 4, name: "3R コース別クイズ", enum_name: "round3", matchmaking_class: Matchmaking::Round3 },
    { id: 5, name: "準々決勝 60問早押しクイズ", enum_name: "quarterfinal", matchmaking_class: Matchmaking::Quarterfinal },
    { id: 6, name: "準決勝 スーパーショックランド", enum_name: "semifinal", matchmaking_class: Matchmaking::Semifinal },
    { id: 7, name: "決勝 ななつぼし獲得クイズ", enum_name: "final", matchmaking_class: Matchmaking::Final },
  ]

  def matchings
    Matching.joins(:match).where(match: { round_id: id })
  end
end

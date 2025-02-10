class Matching < ApplicationRecord
  belongs_to :match
  belongs_to :player

  enum :status, { playing: "playing", waiting: "waiting", win: "win", lose: "lose", set_win: "set_win" }, prefix: true

  # @rbs match: Match
  # @rbs player: Player
  # @rbs seat: Integer
  # @rbs return: Matching
  def self.create_with_initial_state!(match:, player:, seat:)
    Matching.create!(match:, player:, seat:, **match.rule.initial_matching_attributes_of(seat))
  end

  # @rbs match: Match
  # @rbs return: Integer
  def self.highest_vacant_rank(match)
    select("rank + 1")
      .where(<<~SQL, match.id)
        rank + 1 not in (select rank from matchings where rank is not null and match_id = ?)
        SQL
      .minimum("rank + 1") || 1
  end

  # @rbs match: Match
  # @rbs return: Integer
  def self.lowest_vacant_rank(match)
    select("rank - 1")
      .where(<<~SQL, match.id)
        rank - 1 not in (select rank from matchings where rank is not null and match_id = ?)
        SQL
      .maximum("rank - 1") || match.matchings.size
  end
end

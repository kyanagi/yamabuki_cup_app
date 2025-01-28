class Matching < ApplicationRecord
  belongs_to :match
  belongs_to :player

  enum :status, { playing: "playing", waiting: "waiting", win: "win", lose: "lose" }, prefix: true

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

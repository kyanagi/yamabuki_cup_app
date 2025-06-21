class Score < ApplicationRecord
  belongs_to :matching
  belongs_to :score_operation

  enum :status, { playing: "playing", waiting: "waiting", win: "win", lose: "lose", set_win: "set_win" }, prefix: true

  # まだ埋まっていない順位のうち、最高位を返す。
  # @rbs scores: Array[Score]
  # @rbs return: Integer
  def self.highest_vacant_rank(scores)
    occupied_ranks = scores.filter_map(&:rank).to_set
    1.upto(scores.size).find { |rank| !occupied_ranks.include?(rank) }
  end

  # まだ埋まっていない順位のうち、最低位を返す。
  # @rbs scores: Array[Score]
  # @rbs return: Integer
  def self.lowest_vacant_rank(scores)
    occupied_ranks = scores.filter_map(&:rank).to_set
    scores.size.downto(1).find { |rank| !occupied_ranks.include?(rank) }
  end

  def score_changed?
    !!@score_changed
  end

  def mark_as_score_changed
    @score_changed = true
  end
end

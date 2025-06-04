module Matchmaking
  class Final < ActiveType::Object
    attribute :force, :boolean, default: false

    validate :matching_should_not_exist
    validate :previous_round_should_be_complete

    before_save :create_matchings

    # @rbs return: bool
    def self.done?
      Round::FINAL.matchings.count == MatchRule::Final::NUM_SEATS * Round::FINAL.matches.count
    end

    private

    def matching_should_not_exist #: void
      return if force

      if Round::FINAL.matchings.exists?
        errors.add(:base, "決勝のマッチングが既に存在します")
      end
    end

    def previous_round_should_be_complete #: void
      sf_winners_count = Round::SEMIFINAL.matches.sum do |match|
        match.current_scores.status_win.count
      end
      if sf_winners_count != MatchRule::Final::NUM_SEATS * Round::FINAL.matches.count
        errors.add(:base, "準決勝の勝者がそろっていません。")
      end
    end

    def create_matchings #: void
      Round::FINAL.matchings.each(&:destroy!)

      match = Round::FINAL.matches.first!

      sf_winners = Round::SEMIFINAL.matches.flat_map do |match|
        match.current_scores.status_win.map { |s| s.matching.player }
      end
      sorted_target_players = sf_winners.sort_by { |player| player.yontaku_player_result.rank }

      sorted_target_players.each_with_index do |player, seat|
        Matching.create!(match:, player:, seat:)
      end
      MatchOpening.create!(match:)
    end
  end
end

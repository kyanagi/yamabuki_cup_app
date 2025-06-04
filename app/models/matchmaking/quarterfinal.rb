module Matchmaking
  class Quarterfinal < ActiveType::Object
    attribute :force, :boolean, default: false

    validate :matching_should_not_exist
    validate :previous_round_should_be_completed

    before_save :create_matchings

    # @rbs return: bool
    def self.done?
      Round::QUARTERFINAL.matchings.count == MatchRule::Quarterfinal::NUM_SEATS * Round::QUARTERFINAL.matches.count
    end

    private

    def matching_should_not_exist #: void
      return if force

      if Round::QUARTERFINAL.matchings.exists?
        errors.add(:base, "準々決勝のマッチングが既に存在します")
      end
    end

    def previous_round_should_be_completed #: void
      round3_winners_count = Round::ROUND3.matches.sum do |match|
        match.current_scores.status_win.count
      end
      if round3_winners_count != MatchRule::Quarterfinal::NUM_SEATS * Round::QUARTERFINAL.matches.count
        errors.add(:base, "3Rの勝者がそろっていません。")
      end
    end

    def create_matchings #: void
      Round::QUARTERFINAL.matchings.each(&:destroy!)

      matches = Round::QUARTERFINAL.matches.order(:match_number).to_a

      round3_winners = Round::ROUND3.matches.flat_map do |match|
        match.current_scores.status_win.map { |s| s.matching.player }
      end
      sorted_target_players = round3_winners.sort_by { |player| player.yontaku_player_result.rank }

      players_by_match = matches.index_with { [] }
      sorted_target_players.zip(matches.cycle) do |player, match|
        players_by_match[match] << player
      end

      players_by_match.each do |match, players|
        players.each_with_index do |player, seat|
          Matching.create!(match:, player:, seat:)
        end
        MatchOpening.create!(match:)
      end
    end
  end
end

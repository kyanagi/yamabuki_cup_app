module Matchmaking
  class Semifinal < ActiveType::Object
    attribute :force, :boolean, default: false

    validate :matching_should_not_exist
    validate :quarterfinal_winners_should_be_complete

    before_save :create_matchings

    # @rbs return: bool
    def self.done?
      Round::SEMIFINAL.matchings.count == MatchRule::Semifinal::NUM_SEATS * Round::SEMIFINAL.matches.count
    end

    private

    def matching_should_not_exist #: void
      return if force

      if Round::SEMIFINAL.matchings.exists?
        errors.add(:base, "準決勝のマッチングが既に存在します")
      end
    end

    def quarterfinal_winners_should_be_complete #: void
      qf_winners_count = Round::QUARTERFINAL.matches.sum do |match|
        match.current_scores.count(&:status_win?)
      end
      if qf_winners_count != 8
        errors.add(:base, "準々決勝の勝者が8人揃っていません")
      end
    end

    def create_matchings #: void
      Round::SEMIFINAL.matchings.each(&:destroy!)

      matches = Round::SEMIFINAL.matches.order(:match_number).to_a

      qf_winners = Round::QUARTERFINAL.matches.flat_map do |match|
        match.current_scores.status_win.map { |s| s.matching.player }
      end
      sorted_target_players = qf_winners.sort_by { |player| player.yontaku_player_result.rank }

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

module Matchmaking
  class Quarterfinal < ActiveType::Object
    attribute :force, :boolean, default: false

    validate :matching_should_not_exist

    before_save :create_matchings

    private

    def matching_should_not_exist #: void
      return if force

      if Round::QUARTERFINAL.matchings.exists?
        errors.add(:base, "準々決勝のマッチングが既に存在します")
      end
    end

    def create_matchings #: void
      Round::QUARTERFINAL.matchings.each(&:destroy!)

      matches = Round::QUARTERFINAL.matches.order(:match_number).to_a

      round3_winners = Round::ROUND3.matchings.status_win.map(&:player)
      sorted_target_players = round3_winners.sort_by { |player| player.yontaku_player_result.rank }

      players_by_match = matches.index_with { [] }
      sorted_target_players.zip(matches.cycle) do |player, match|
        players_by_match[match] << player
      end

      players_by_match.each do |match, players|
        players.each_with_index do |player, seat|
          Matching.create_with_initial_state!(match:, player:, seat:)
        end
      end
    end
  end
end

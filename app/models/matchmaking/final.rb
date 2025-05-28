module Matchmaking
  class Final < ActiveType::Object
    attribute :force, :boolean, default: false

    validate :matching_should_not_exist

    before_save :create_matchings

    private

    def matching_should_not_exist #: void
      return if force

      if Round::FINAL.matchings.exists?
        errors.add(:base, "決勝のマッチングが既に存在します")
      end
    end

    def create_matchings #: void
      Round::FINAL.matchings.each(&:destroy!)

      match = Round::FINAL.matches.first!

      sf_winners = Round::SEMIFINAL.matches.flat_map do |match|
        last_score_operation = match.score_operations.last
        last_score_operation.scores.status_win.map { |s| s.matching.player }
      end
      sorted_target_players = sf_winners.sort_by { |player| player.yontaku_player_result.rank }

      sorted_target_players.each_with_index do |player, seat|
        Matching.create!(match:, player:, seat:)
      end
      MatchOpening.create!(match:)
    end
  end
end

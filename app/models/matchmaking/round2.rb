module Matchmaking
  class Round2 < ActiveType::Object
    NUM_SEED_PLAYERS = 7

    attribute :force, :boolean, default: false

    validate :matching_should_not_exist

    before_save :create_matchings

    private

    def matching_should_not_exist #: void
      return if force

      if Round::ROUND2.matchings.exists?
        errors.add(:base, "2Rのマッチングが既に存在します")
      end
    end

    def create_matchings #: void
      Round::ROUND2.matchings.each(&:destroy!)

      matches = Round::ROUND2.matches.order(:match_number).to_a
      num_seats = MatchRule::Round2::NUM_SEATS
      num_players = matches.size * num_seats

      rank_first = NUM_SEED_PLAYERS + 1
      rank_last = NUM_SEED_PLAYERS + num_players
      target_player_ids = YontakuPlayerResult.where(rank: rank_first..rank_last).order(:rank).pluck(:player_id)
      target_player_ids.jabara_for(matches).each do |match, player_ids|
        player_ids.each_with_index do |player_id, seat|
          Matching.create!(match:, player_id:, seat:)
        end
        MatchOpening.create!(match:)
      end
    end
  end
end

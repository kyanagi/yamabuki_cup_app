module Matchmaking
  class Round3 < ActiveType::Object
    NUM_SEED_PLAYERS = 7

    attribute :force, :boolean, default: false

    validate :matching_should_not_exist

    before_save :create_matchings

    private

    def matching_should_not_exist #: void
      return if force

      if Round::ROUND3.matchings.exists?
        errors.add(:base, "3Rのマッチングが既に存在します")
      end
    end

    def create_matchings #: void
      Round::ROUND3.matchings.each(&:destroy!)

      matches = Round::ROUND3.matches.order(:match_number).to_a

      seeded_players = YontakuPlayerResult.round2_seeded.preload(:player).map(&:player)
      round2_winners = Round::ROUND2.matchings.status_win.map(&:player)
      sorted_target_players = (seeded_players + round2_winners).sort_by { |player| player.yontaku_player_result.rank }

      players_by_match = matches.index_with { [] }
      sorted_target_players.each do |player|
        preference = player.round3_course_preference
        preference.choices.each do |wanted_match|
          if players_by_match[wanted_match].size < wanted_match.rule.class::NUM_SEATS
            players_by_match[wanted_match] << player
            break
          end
        end
      end

      players_by_match.each do |match, players|
        players.each_with_index do |player, seat|
          Matching.create_with_initial_state!(match:, player:, seat:)
        end
      end
    end
  end
end

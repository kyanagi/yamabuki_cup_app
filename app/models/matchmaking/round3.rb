module Matchmaking
  class Round3 < ActiveType::Object
    NUM_SEED_PLAYERS = 7

    attribute :force, :boolean, default: false

    validate :matching_should_not_exist
    validate :previous_round_should_be_complete

    before_save :create_matchings

    # @rbs return: bool
    def self.done?
      Round::ROUND3.matchings.count == Round::ROUND3.matches.sum { |m| m.rule_class::NUM_SEATS }
    end

    private

    def matching_should_not_exist #: void
      return if force

      if Round::ROUND3.matchings.exists?
        errors.add(:base, "3Rのマッチングが既に存在します")
      end
    end

    def previous_round_should_be_complete #: void
      seeded_players_count = YontakuPlayerResult.round2_seeded.count
      round2_winners_count = Round::ROUND2.matches.sum do |match|
        match.current_scores.status_win.count
      end
      if seeded_players_count + round2_winners_count != Round::ROUND3.matches.sum { |m| m.rule_class::NUM_SEATS }
        errors.add(:base, "2Rの勝者がそろっていません。")
      end
    end

    def create_matchings #: void
      Round::ROUND3.matchings.each(&:destroy!)

      matches = Round::ROUND3.matches.order(:match_number).to_a

      seeded_players = YontakuPlayerResult.round2_seeded.preload(:player).map(&:player)
      round2_winners = Round::ROUND2.matches.flat_map do |match|
        match.current_scores.status_win.map { |s| s.matching.player }
      end
      sorted_target_players = (seeded_players + round2_winners).sort_by { |player| player.yontaku_player_result.rank }

      players_by_match = matches.index_with { [] }
      sorted_target_players.each do |player|
        preference = player.round3_course_preference
        preference.choices.each do |wanted_match|
          if players_by_match[wanted_match].size < wanted_match.rule_class::NUM_SEATS
            players_by_match[wanted_match] << player
            break
          end
        end
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

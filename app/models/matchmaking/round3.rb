module Matchmaking
  class Round3 < ActiveType::Object
    NUM_SEED_PLAYERS = 7
    NUM_OMOTE_WINNERS = MatchRule::Round2Omote::NUM_WINNERS * 5
    NUM_PLAYOFF_WINNERS = MatchRule::Playoff::NUM_WINNERS * 5

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
      seeded_players_count = YontakuPlayerResult.round3_seeded.count
      round2_omote_winners_count = Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").sum do |match|
        match.current_scores.status_win.count
      end
      playoff_winners_count = Round::PLAYOFF.matches.sum do |match|
        match.current_scores.status_win.count
      end
      required_players = Round::ROUND3.matches.sum { |m| m.rule_class::NUM_SEATS }

      if seeded_players_count != NUM_SEED_PLAYERS
        errors.add(:base, "1Rシードの人数が不足しています。")
      end
      if round2_omote_winners_count != NUM_OMOTE_WINNERS
        errors.add(:base, "2R表の勝者がそろっていません。")
      end
      if playoff_winners_count != NUM_PLAYOFF_WINNERS
        errors.add(:base, "プレーオフの勝者がそろっていません。")
      end
      if seeded_players_count + round2_omote_winners_count + playoff_winners_count != required_players
        errors.add(:base, "3R進出者の人数が不足しています。")
      end
    end

    def create_matchings #: void
      Round::ROUND3.matchings.each(&:destroy!)

      matches = Round::ROUND3.matches.order(:match_number).to_a

      seeded_players = YontakuPlayerResult.round3_seeded.preload(:player).map(&:player)
      round2_omote_winners = Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").flat_map do |match|
        match.current_scores.status_win.map { |s| s.matching.player }
      end
      playoff_winners = Round::PLAYOFF.matches.flat_map do |match|
        match.current_scores.status_win.map { |s| s.matching.player }
      end
      sorted_target_players = (seeded_players + round2_omote_winners + playoff_winners).sort_by do |player|
        player.yontaku_player_result.rank
      end

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

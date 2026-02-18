module Matchmaking
  class Playoff < ActiveType::Object
    OMOTE_LOSER_COUNT = 6
    URA_WINNER_COUNT = 4

    PLAYOFF_ASSIGNMENT = {
      1 => [
        [:omote, 1, 1], [:omote, 2, 2], [:omote, 3, 3], [:omote, 4, 4], [:omote, 5, 5],
        [:omote, 5, 6], [:ura, 4, 1], [:ura, 3, 2], [:ura, 2, 3], [:ura, 1, 4],
      ],
      2 => [
        [:omote, 2, 1], [:omote, 3, 2], [:omote, 4, 3], [:omote, 5, 4], [:omote, 1, 5],
        [:omote, 4, 6], [:ura, 3, 1], [:ura, 2, 2], [:ura, 1, 3], [:ura, 5, 4],
      ],
      3 => [
        [:omote, 3, 1], [:omote, 4, 2], [:omote, 5, 3], [:omote, 1, 4], [:omote, 2, 5],
        [:omote, 3, 6], [:ura, 2, 1], [:ura, 1, 2], [:ura, 5, 3], [:ura, 4, 4],
      ],
      4 => [
        [:omote, 4, 1], [:omote, 5, 2], [:omote, 1, 3], [:omote, 2, 4], [:omote, 3, 5],
        [:omote, 2, 6], [:ura, 1, 1], [:ura, 5, 2], [:ura, 4, 3], [:ura, 3, 4],
      ],
      5 => [
        [:omote, 5, 1], [:omote, 1, 2], [:omote, 2, 3], [:omote, 3, 4], [:omote, 4, 5],
        [:omote, 1, 6], [:ura, 5, 1], [:ura, 4, 2], [:ura, 3, 3], [:ura, 2, 4],
      ],
    }.freeze

    attribute :force, :boolean, default: false

    validate :matching_should_not_exist
    validate :previous_round_should_be_complete

    before_save :create_matchings

    # @rbs return: bool
    def self.done?
      Round::PLAYOFF.matchings.count == Round::PLAYOFF.matches.sum { |m| m.rule_class::NUM_SEATS }
    end

    private

    def matching_should_not_exist #: void
      return if force

      if Round::PLAYOFF.matchings.exists?
        errors.add(:base, "プレーオフのマッチングが既に存在します")
      end
    end

    def previous_round_should_be_complete #: void
      if omote_matches.any? { it.current_scores.status_win.count < MatchRule::Round2Omote::NUM_WINNERS }
        errors.add(:base, "2R表の勝者がそろっていません。")
      end
      if ura_matches.any? { it.current_scores.status_win.count < MatchRule::Round2Ura::NUM_WINNERS }
        errors.add(:base, "2R裏の勝者がそろっていません。")
      end
    end

    def create_matchings #: void
      Round::PLAYOFF.matchings.each(&:destroy!)

      omote_losers = omote_matches.index_with do |match|
        scores = match.current_scores.select { !it.status_win? }
        sorted_scores = scores.sort_by { |score| [-score.points, score.misses, score.matching.seat] }
        sorted_scores.first(OMOTE_LOSER_COUNT).map { it.matching.player }
      end
      ura_winners = ura_matches.index_with do |match|
        scores = match.current_scores.select(&:status_win?)
        sorted_scores = scores.sort_by { |score| score.rank || Float::INFINITY }
        sorted_scores.first(URA_WINNER_COUNT).map { it.matching.player }
      end

      playoff_matches.each do |playoff_match|
        assignment = PLAYOFF_ASSIGNMENT.fetch(playoff_match.match_number)
        assignment.each_with_index do |(room, match_number, number_in_group), seat|
          player = player_for(room, match_number, number_in_group, omote_losers, ura_winners)
          Matching.create!(match: playoff_match, player:, seat:)
        end
        MatchOpening.create!(match: playoff_match)
      end
    end

    # @rbs room: Symbol
    # @rbs match_number: Integer
    # @rbs number_in_group: Integer
    # @rbs omote_losers: Hash[Match, Array[Player]]
    # @rbs ura_winners: Hash[Match, Array[Player]]
    # @rbs return: Player
    def player_for(room, match_number, number_in_group, omote_losers, ura_winners)
      group_index = match_number - 1
      source_players =
        case room
        when :omote
          omote_losers.fetch(omote_matches[group_index])
        when :ura
          ura_winners.fetch(ura_matches[group_index])
        else
          raise ArgumentError, "unknown room: #{room}"
        end

      player = source_players[number_in_group - 1]
      return player if player

      raise ActiveRecord::RecordInvalid, "#{room}#{match_number}組の#{number_in_group}番目が見つかりません"
    end

    # @rbs return: Array[Match]
    def omote_matches
      Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").order(:match_number).to_a
    end

    # @rbs return: Array[Match]
    def ura_matches
      Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Ura").order(:match_number).to_a
    end

    # @rbs return: Array[Match]
    def playoff_matches
      Round::PLAYOFF.matches.order(:match_number).to_a
    end
  end
end

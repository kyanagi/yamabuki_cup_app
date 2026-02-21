module Matchmaking
  class Round2 < ActiveType::Object
    NUM_SEED_PLAYERS = 7
    MINIMUM_SUPPORTED_PLAYERS = 77

    OMOTE_RANKS_BY_GROUP = [
      [8, 17, 18, 27, 28, 37, 38, 47, 48, 57],
      [9, 16, 19, 26, 29, 36, 39, 46, 49, 56],
      [10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
      [11, 14, 21, 24, 31, 34, 41, 44, 51, 54],
      [12, 13, 22, 23, 32, 33, 42, 43, 52, 53],
    ].freeze

    URA_RANKS_BY_GROUP = [
      [58, 67, 68, 77, 78, 87, 88, 97, 98, 107, 108, 117],
      [59, 66, 69, 76, 79, 86, 89, 96, 99, 106, 109, 116],
      [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115],
      [61, 64, 71, 74, 81, 84, 91, 94, 101, 104, 111, 114],
      [62, 63, 72, 73, 82, 83, 92, 93, 102, 103, 112, 113],
    ].freeze

    attribute :force, :boolean, default: false

    validate :matching_should_not_exist
    validate :minimum_players_should_be_satisfied

    before_save :create_matchings

    # @rbs return: bool
    def self.done?
      matches = Round::ROUND2.matches
      matches.present? && matches.all? { it.matchings.exists? && it.last_score_operation.present? }
    end

    private

    def matching_should_not_exist #: void
      return if force

      if Round::ROUND2.matchings.exists?
        errors.add(:base, "2Rのマッチングが既に存在します")
      end
    end

    def minimum_players_should_be_satisfied #: void
      if YontakuPlayerResult.count < MINIMUM_SUPPORTED_PLAYERS
        errors.add(:base, "2Rの組分けには少なくとも#{MINIMUM_SUPPORTED_PLAYERS}人の結果が必要です")
      end
    end

    def create_matchings #: void
      Round::ROUND2.matchings.each(&:destroy!)

      results_by_rank = YontakuPlayerResult
        .includes(player: :player_profile)
        .where(rank: (NUM_SEED_PLAYERS + 1)..)
        .index_by(&:rank)

      omote_matches.each_with_index do |match, group_index|
        create_matchings_for(match, OMOTE_RANKS_BY_GROUP[group_index], results_by_rank, mandatory: true)
      end

      ura_matches.each_with_index do |match, group_index|
        create_matchings_for(match, URA_RANKS_BY_GROUP[group_index], results_by_rank, mandatory: false, sort_by_name: true)
      end
    end

    # @rbs return: Array[Match]
    def omote_matches
      Round::ROUND2
        .matches
        .where(rule_name: "MatchRule::Round2Omote")
        .order(:match_number)
        .to_a
    end

    # @rbs return: Array[Match]
    def ura_matches
      Round::ROUND2
        .matches
        .where(rule_name: "MatchRule::Round2Ura")
        .order(:match_number)
        .to_a
    end

    # @rbs match: Match
    # @rbs ranks: Array[Integer]
    # @rbs results_by_rank: Hash[Integer, YontakuPlayerResult]
    # @rbs mandatory: bool
    # @rbs sort_by_name: bool
    # @rbs return: void
    def create_matchings_for(match, ranks, results_by_rank, mandatory:, sort_by_name: false)
      results = ranks.filter_map do |rank|
        result = results_by_rank[rank]
        if mandatory && result.nil?
          raise ActiveRecord::RecordInvalid, "2R表の必要順位(#{rank}位)の結果がありません"
        end
        result
      end

      results = sort_results_by_name(results) if sort_by_name

      results.each_with_index do |result, seat|
        Matching.create!(match:, player_id: result.player_id, seat:)
      end
      MatchOpening.create!(match:)
    end

    # @rbs results: Array[YontakuPlayerResult]
    # @rbs return: Array[YontakuPlayerResult]
    def sort_results_by_name(results)
      results.sort_by do |result|
        profile = result.player.player_profile
        [
          profile&.family_name_kana.to_s,
          profile&.given_name_kana.to_s,
          profile&.family_name.to_s,
          profile&.given_name.to_s,
          result.rank,
        ]
      end
    end
  end
end

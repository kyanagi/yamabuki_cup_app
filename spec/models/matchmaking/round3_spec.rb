require "rails_helper"

RSpec.describe Matchmaking::Round3, type: :model do
  before do
    Rails.application.load_seed
    1.upto(117) { |rank| create(:yontaku_player_result, rank:) }
  end

  let(:round3_matches) { Round::ROUND3.matches.order(:match_number).to_a }

  def setup_round2_results
    Matchmaking::Round2.create!

    Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").find_each do |match|
      score_operation = create(:score_operation, match:)
      match.update!(last_score_operation: score_operation)
      match.matchings.order(:seat).each do |matching|
        status = matching.seat <= 3 ? "win" : "lose"
        points = matching.seat <= 3 ? 3 : 0
        create(:score, score_operation:, matching:, status:, points:, misses: 0, rank: (matching.seat <= 3 ? matching.seat + 1 : nil))
      end
    end

    Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Ura").find_each do |match|
      score_operation = create(:score_operation, match:)
      match.update!(last_score_operation: score_operation)
      match.matchings.order(:seat).each do |matching|
        status = matching.seat <= 3 ? "win" : "lose"
        points = matching.seat <= 3 ? 3 : 0
        create(:score, score_operation:, matching:, status:, points:, misses: 0, rank: (matching.seat <= 3 ? matching.seat + 1 : nil))
      end
    end
  end

  def setup_playoff_results(first_match_winner_count: 1)
    Matchmaking::Playoff.create!

    Round::PLAYOFF.matches.order(:match_number).each_with_index do |match, index|
      winner_count = index.zero? ? first_match_winner_count : 1
      score_operation = create(:score_operation, match:)
      match.update!(last_score_operation: score_operation)
      match.matchings.order(:seat).each do |matching|
        status = matching.seat < winner_count ? "win" : "lose"
        points = matching.seat < winner_count ? 1 : 0
        create(:score, score_operation:, matching:, status:, points:, misses: 0, rank: (matching.seat < winner_count ? 1 : nil))
      end
    end
  end

  def setup_round3_preferences
    Player.find_each do |player|
      next if player.round3_course_preference

      create(
        :round3_course_preference,
        player:,
        choice1_match: round3_matches[0],
        choice2_match: round3_matches[1],
        choice3_match: round3_matches[2],
        choice4_match: round3_matches[3]
      )
    end
  end

  describe "バリデーション" do
    before do
      setup_round2_results
      setup_playoff_results(first_match_winner_count: 0)
      setup_round3_preferences
    end

    it "プレーオフ勝者が不足していると無効であること" do
      matchmaking = described_class.new
      expect(matchmaking).to be_invalid
      expect(matchmaking.errors[:base]).to include "プレーオフの勝者がそろっていません。"
    end
  end

  describe "#create_matchings" do
    before do
      setup_round2_results
      setup_playoff_results
      setup_round3_preferences
    end

    it "1Rシード7名 + 2R表勝者20名 + プレーオフ勝者5名の32名を3Rに割り当てること" do
      described_class.create!

      seeded_ranks = YontakuPlayerResult.round3_seeded.pluck(:rank)
      omote_winner_ranks = Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").flat_map do |match|
        match.current_scores.status_win.map { it.matching.player.yontaku_player_result.rank }
      end
      playoff_winner_ranks = Round::PLAYOFF.matches.flat_map do |match|
        match.current_scores.status_win.map { it.matching.player.yontaku_player_result.rank }
      end
      expected_ranks = (seeded_ranks + omote_winner_ranks + playoff_winner_ranks).sort

      assigned_ranks = round3_matches.flat_map do |match|
        match.reload
        scores = match.current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expect(scores.map(&:status)).to eq(["playing"] * 8)
        expect(scores.map(&:points)).to eq([0] * 8)
        scores.map { it.matching.player.yontaku_player_result.rank }
      end

      expect(assigned_ranks.size).to eq(32)
      expect(assigned_ranks.sort).to eq(expected_ranks)
    end
  end
end

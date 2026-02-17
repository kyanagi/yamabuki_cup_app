require "rails_helper"

RSpec.describe Matchmaking::Playoff, type: :model do
  let(:omote_loser_seat_order) { [5, 6, 4, 7, 8, 9] }
  let(:ura_winner_seat_order) { [1, 2, 0, 3] }
  let(:omote_matches) { Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").order(:match_number).to_a }
  let(:ura_matches) { Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Ura").order(:match_number).to_a }
  let(:playoff_matches) { Round::PLAYOFF.matches.order(:match_number).to_a }

  before do
    Rails.application.load_seed
    1.upto(117) { |rank| create(:yontaku_player_result, rank:) }
  end

  def setup_round2_results
    Matchmaking::Round2.create!

    omote_matches.each do |match|
      score_operation = create(:score_operation, match:)
      match.update!(last_score_operation: score_operation)

      match.matchings.order(:seat).each do |matching|
        seat = matching.seat
        points = {
          0 => 8,
          1 => 7,
          2 => 6,
          3 => 5,
          4 => 3,
          5 => 5,
          6 => 4,
          7 => 2,
          8 => 1,
          9 => 0,
        }.fetch(seat)
        misses = {
          0 => 0,
          1 => 0,
          2 => 0,
          3 => 0,
          4 => 1,
          5 => 0,
          6 => 0,
          7 => 2,
          8 => 0,
          9 => 0,
        }.fetch(seat)
        status = seat <= 3 ? "win" : "playing"
        rank = seat <= 3 ? seat + 1 : nil
        create(:score, score_operation:, matching:, status:, points:, misses:, rank:)
      end
    end

    ura_matches.each do |match|
      score_operation = create(:score_operation, match:)
      match.update!(last_score_operation: score_operation)

      match.matchings.order(:seat).each do |matching|
        seat = matching.seat
        points = {
          0 => 4,
          1 => 6,
          2 => 5,
          3 => 3,
        }.fetch(seat, 0)
        status = seat <= 3 ? "win" : "lose"
        rank = seat <= 3 ? seat + 1 : nil
        create(:score, score_operation:, matching:, status:, points:, misses: 0, rank:)
      end
    end
  end

  describe "バリデーション" do
    it "2R裏の勝者が不足していると無効であること" do
      Matchmaking::Round2.create!

      ura_matches.each_with_index do |match, idx|
        score_operation = create(:score_operation, match:)
        match.update!(last_score_operation: score_operation)
        match.matchings.order(:seat).each do |matching|
          seat = matching.seat
          status = if idx.zero? && seat == 3
                     "playing"
                   elsif seat <= 3
                     "win"
                   else
                     "lose"
                   end
          create(:score, score_operation:, matching:, status:, points: 0, misses: 0)
        end
      end

      omote_matches.each do |match|
        score_operation = create(:score_operation, match:)
        match.update!(last_score_operation: score_operation)
        match.matchings.order(:seat).each do |matching|
          create(:score, score_operation:, matching:, status: (matching.seat <= 3 ? "win" : "lose"), points: 0, misses: 0)
        end
      end

      matchmaking = described_class.new
      expect(matchmaking).to be_invalid
      expect(matchmaking.errors[:base]).to include "2R裏の勝者がそろっていません。"
    end
  end

  describe "#create_matchings" do
    before do
      setup_round2_results
    end

    it "仕様の固定表どおりに10名×5組を作成すること" do
      described_class.create!

      playoff_matches.each do |match|
        scores = match.current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expected_ranks = Matchmaking::Playoff::PLAYOFF_ASSIGNMENT.fetch(match.match_number).map do |(room, group_number, number)|
          case room
          when :omote
            rank_index = omote_loser_seat_order[number - 1]
            Matchmaking::Round2::OMOTE_RANKS_BY_GROUP[group_number - 1][rank_index]
          when :ura
            rank_index = ura_winner_seat_order[number - 1]
            Matchmaking::Round2::URA_RANKS_BY_GROUP[group_number - 1][rank_index]
          end
        end

        expect(scores.map { it.matching.player.yontaku_player_result.rank }).to eq(expected_ranks)
      end
    end
  end
end

require "rails_helper"

RSpec.describe Matchmaking::Round2, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "バリデーション" do
    context "2Rのマッチングが既に存在する場合" do
      before do
        create(:matching, match: Round::ROUND2.matches.first)
        1.upto(77) { |rank| create(:yontaku_player_result, rank:) }
      end

      it "バリデーションが失敗すること" do
        matchmaking = described_class.new
        expect(matchmaking).to be_invalid
        expect(matchmaking.errors[:base]).to include "2Rのマッチングが既に存在します"
      end
    end

    context "参加者が77名未満の場合" do
      before do
        1.upto(76) { |rank| create(:yontaku_player_result, rank:) }
      end

      it "バリデーションが失敗すること" do
        matchmaking = described_class.new
        expect(matchmaking).to be_invalid
        expect(matchmaking.errors[:base]).to include "2Rの組分けには少なくとも77人の結果が必要です"
      end
    end
  end

  describe "#create_matchings" do
    let(:force) { false }
    let(:omote_matches) { Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Omote").order(:match_number).to_a }
    let(:ura_matches) { Round::ROUND2.matches.where(rule_name: "MatchRule::Round2Ura").order(:match_number).to_a }

    before do
      1.upto(player_count) { |rank| create(:yontaku_player_result, rank:) }
    end

    shared_examples "2Rの組分けが仕様どおり作成されること" do
      it "2R表/裏の組分けと初期スコアが正しいこと" do
        described_class.create!(force:)

        omote_matches.each_with_index do |match, index|
          match.reload
          scores = match.current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
          expected_ranks = Matchmaking::Round2::OMOTE_RANKS_BY_GROUP[index].select { it <= player_count }
          expected_points = Array.new(expected_ranks.size, 0)
          0.upto(2) { |seat| expected_points[seat] = 1 if seat < expected_points.size }

          expect(scores.map { it.matching.player.yontaku_player_result.rank }).to eq(expected_ranks)
          expect(scores.map(&:status)).to eq(["playing"] * expected_ranks.size)
          expect(scores.map(&:misses)).to eq([0] * expected_ranks.size)
          expect(scores.map(&:points)).to eq(expected_points)
          expect(scores.map { it.matching.seat }).to eq((0...expected_ranks.size).to_a)
        end

        ura_matches.each_with_index do |match, index|
          match.reload
          scores = match.current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
          expected_ranks = Matchmaking::Round2::URA_RANKS_BY_GROUP[index].select { it <= player_count }

          expect(scores.map { it.matching.player.yontaku_player_result.rank }).to eq(expected_ranks)
          expect(scores.map(&:status)).to eq(["playing"] * expected_ranks.size)
          expect(scores.map(&:misses)).to eq([0] * expected_ranks.size)
          expect(scores.map(&:points)).to eq([0] * expected_ranks.size)
          expect(scores.map { it.matching.seat }).to eq((0...expected_ranks.size).to_a)
        end
      end
    end

    context "参加者が117名いる場合" do
      let(:player_count) { 117 }

      it_behaves_like "2Rの組分けが仕様どおり作成されること"
    end

    context "参加者が100名いる場合" do
      let(:player_count) { 100 }

      it_behaves_like "2Rの組分けが仕様どおり作成されること"
    end

    context "既存マッチングがあり force: true の場合" do
      let(:player_count) { 117 }
      let(:force) { true }

      before do
        omote_matches.first.matchings.create!(player: create(:player), seat: 0)
      end

      it_behaves_like "2Rの組分けが仕様どおり作成されること"
    end
  end
end

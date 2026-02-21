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

    def create_player_profile_for_rank(rank:, family_name:, family_name_kana:)
      result = YontakuPlayerResult.find_by!(rank:)
      create(
        :player_profile,
        player: result.player,
        entry_list_name: family_name,
        family_name:,
        given_name: "太郎",
        family_name_kana:,
        given_name_kana: "たろう"
      )
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

    context "2R裏の同一組内で席順を五十音順にする場合" do
      let(:player_count) { 117 }

      before do
        create_player_profile_for_rank(rank: 58, family_name: "佐藤", family_name_kana: "さとう")
        create_player_profile_for_rank(rank: 67, family_name: "青木", family_name_kana: "あおき")
        create_player_profile_for_rank(rank: 68, family_name: "山田", family_name_kana: "やまだ")
        create_player_profile_for_rank(rank: 77, family_name: "伊藤", family_name_kana: "いとう")
        create_player_profile_for_rank(rank: 78, family_name: "大野", family_name_kana: "おおの")
        create_player_profile_for_rank(rank: 87, family_name: "上田", family_name_kana: "うえだ")
        create_player_profile_for_rank(rank: 88, family_name: "遠藤", family_name_kana: "えんどう")
        create_player_profile_for_rank(rank: 97, family_name: "加藤", family_name_kana: "かとう")
        create_player_profile_for_rank(rank: 98, family_name: "木村", family_name_kana: "きむら")
        create_player_profile_for_rank(rank: 107, family_name: "久保", family_name_kana: "くぼ")
        create_player_profile_for_rank(rank: 108, family_name: "小林", family_name_kana: "こばやし")
        create_player_profile_for_rank(rank: 117, family_name: "鈴木", family_name_kana: "すずき")
      end

      it "2R裏は同一組内で名前の五十音順にseatが割り当てられること" do
        described_class.create!

        ura_first_match = ura_matches.first
        ura_first_match.reload
        scores = ura_first_match.current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }

        expect(scores.map { it.matching.player.yontaku_player_result.rank }).to eq(
          [67, 77, 87, 88, 78, 97, 98, 107, 108, 58, 117, 68]
        )
      end
    end
  end
end

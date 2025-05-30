require "rails_helper"

RSpec.describe Matchmaking::Round2, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "#matching_should_not_exist" do
    context "2Rのマッチングが既に存在する場合" do
      let(:round) { Round::ROUND2 }
      let(:match) { Round::ROUND2.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが失敗すること" do
        matchmaking = Matchmaking::Round2.new
        expect(matchmaking).to be_invalid
        expect(matchmaking.errors[:base]).to include "2Rのマッチングが既に存在します"
      end
    end

    context "2Rのマッチングが存在しない場合" do
      it "バリデーションが成功すること" do
        matchmaking = Matchmaking::Round2.new
        expect(matchmaking).to be_valid
      end
    end

    context "2Rのマッチングが存在しないが3Rのマッチングが存在する場合" do
      let(:round) { Round::ROUND3 }
      let(:match) { Round::ROUND3.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが成功すること" do
        matchmaking = Matchmaking::Round2.new
        expect(matchmaking).to be_valid
      end
    end
  end

  describe "#create_matchings" do
    let(:round) { Round::ROUND2 }
    let(:matches) { Round::ROUND2.matches.order(:match_number).to_a }
    let(:force) { false }

    before do
      1.upto(100) do |rank|
        create(:yontaku_player_result, rank:)
      end
    end

    shared_examples "2Rの組分けが正しく作成されること" do
      it "2Rの組分けが正しく作成されること" do
        Matchmaking::Round2.create!(force:)

        matches.each(&:reload)

        scores = matches[0].current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..13]
        expect(scores.map do |s|
          s.matching.player.yontaku_player_result.rank
        end).to eq [8, 17, 18, 27, 28, 37, 38, 47, 48, 57, 58, 67, 68, 77]
        expect(scores.map { |s| s.points }).to eq [[1] * 3, [0] * 11].flatten
        expect(scores.map { |s| s.misses }).to eq [0] * 14
        expect(scores.map { |s| s.status }).to eq [["playing"] * 10, ["waiting"] * 4].flatten

        scores = matches[1].current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..13]
        expect(scores.map do |s|
          s.matching.player.yontaku_player_result.rank
        end).to eq [9, 16, 19, 26, 29, 36, 39, 46, 49, 56, 59, 66, 69, 76]
        expect(scores.map { |s| s.points }).to eq [[1] * 3, [0] * 11].flatten
        expect(scores.map { |s| s.misses }).to eq [0] * 14
        expect(scores.map { |s| s.status }).to eq [["playing"] * 10, ["waiting"] * 4].flatten

        scores = matches[2].current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..13]
        expect(scores.map do |s|
          s.matching.player.yontaku_player_result.rank
        end).to eq [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75]
        expect(scores.map { |s| s.points }).to eq [[1] * 3, [0] * 11].flatten
        expect(scores.map { |s| s.misses }).to eq [0] * 14
        expect(scores.map { |s| s.status }).to eq [["playing"] * 10, ["waiting"] * 4].flatten

        scores = matches[3].current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..13]
        expect(scores.map do |s|
          s.matching.player.yontaku_player_result.rank
        end).to eq [11, 14, 21, 24, 31, 34, 41, 44, 51, 54, 61, 64, 71, 74]
        expect(scores.map { |s| s.points }).to eq [[1] * 3, [0] * 11].flatten
        expect(scores.map { |s| s.misses }).to eq [0] * 14
        expect(scores.map { |s| s.status }).to eq [["playing"] * 10, ["waiting"] * 4].flatten

        scores = matches[4].current_scores.preload(matching: { player: :yontaku_player_result }).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..13]
        expect(scores.map do |s|
          s.matching.player.yontaku_player_result.rank
        end).to eq [12, 13, 22, 23, 32, 33, 42, 43, 52, 53, 62, 63, 72, 73]
        expect(scores.map { |s| s.points }).to eq [[1] * 3, [0] * 11].flatten
        expect(scores.map { |s| s.misses }).to eq [0] * 14
        expect(scores.map { |s| s.status }).to eq [["playing"] * 10, ["waiting"] * 4].flatten
      end
    end

    context "マッチングが存在しない場合" do
      it_behaves_like "2Rの組分けが正しく作成されること"
    end

    context "マッチングが存在する場合" do
      before do
        matches[0].matchings.create!(player: create(:player), seat: 0)
      end

      it "エラーになること" do
        m = Matchmaking::Round2.new
        expect { m.save }.not_to(change { Round::ROUND2.matchings.count })
        expect(m.errors).to be_added(:base, "2Rのマッチングが既に存在します")
      end

      context "force: trueを指定したとき" do
        let(:force) { true }

        it_behaves_like "2Rの組分けが正しく作成されること"
      end
    end
  end
end

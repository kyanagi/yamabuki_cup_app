require "rails_helper"

RSpec.describe Matchmaking::QuarterFinal, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "#matching_should_not_exist" do
    let(:matchmaking) { Matchmaking::QuarterFinal.new }

    context "準々決勝のマッチングが既に存在する場合" do
      let(:round) { Round::QUARTER_FINAL }
      let(:match) { Round::QUARTER_FINAL.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが失敗すること" do
        expect(matchmaking).to be_invalid
        expect(matchmaking.errors[:base]).to include "準々決勝のマッチングが既に存在します"
      end
    end

    context "準々決勝のマッチングが存在しない場合" do
      it "バリデーションが成功すること" do
        expect(matchmaking).to be_valid
      end
    end

    context "準々決勝のマッチングが存在しないが3Rのマッチングが存在する場合" do
      let(:round) { Round::ROUND3 }
      let(:match) { Round::ROUND3.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが成功すること" do
        expect(matchmaking).to be_valid
      end
    end
  end

  describe "#create_matchings" do
    let(:round3) { Round::ROUND3 }
    let(:round) { Round::QUARTER_FINAL }
    let(:matches) { Round::QUARTER_FINAL.matches.order(:match_number).to_a }
    let(:force) { false }

    let!(:round3_winners) do
      yontaku_rank = 1
      Round::ROUND3.matches.flat_map do |match|
        create_list(:player, 4).each.with_index(1) do |player, hayaoshi_rank|
          create(:yontaku_player_result, player:, rank: yontaku_rank)
          create(:matching, match:, player:, seat: hayaoshi_rank - 1, status: "win", rank: hayaoshi_rank)
          yontaku_rank += 1
        end
      end
    end

    shared_examples "準々決勝の組分けが正しく作成されること" do
      it "準々決勝の組分けが正しく作成されること" do
        Matchmaking::QuarterFinal.create!(force:)

        matchings = matches[0].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq([0, 2, 4, 6, 8, 10, 12, 14].map { round3_winners[it].id })

        matchings = matches[1].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq([1, 3, 5, 7, 9, 11, 13, 15].map { round3_winners[it].id })
      end
    end

    context "マッチングが存在しない場合" do
      it_behaves_like "準々決勝の組分けが正しく作成されること"
    end

    context "マッチングが存在する場合" do
      before do
        matches[0].matchings.create!(player: create(:player), seat: 0)
      end

      it "エラーになること" do
        m = Matchmaking::QuarterFinal.new
        expect { m.save }.not_to(change { Round::QUARTER_FINAL.matchings.count })
        expect(m.errors).to be_added(:base, "準々決勝のマッチングが既に存在します")
      end

      context "force: trueを指定したとき" do
        let(:force) { true }

        it_behaves_like "準々決勝の組分けが正しく作成されること"
      end
    end
  end
end

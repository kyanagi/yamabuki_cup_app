require "rails_helper"

RSpec.describe Matchmaking::Round3, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "#matching_should_not_exist" do
    let(:matchmaking) { Matchmaking::Round3.new }

    context "3Rのマッチングが既に存在する場合" do
      let(:round) { Round::ROUND3 }
      let(:match) { Round::ROUND3.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが失敗すること" do
        expect(matchmaking).to be_invalid
        expect(matchmaking.errors[:base]).to include "3Rのマッチングが既に存在します"
      end
    end

    context "3Rのマッチングが存在しない場合" do
      it "バリデーションが成功すること" do
        expect(matchmaking).to be_valid
      end
    end

    context "3Rのマッチングが存在しないが2Rのマッチングが存在する場合" do
      let(:round) { Round::ROUND2 }
      let(:match) { Round::ROUND2.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが成功すること" do
        expect(matchmaking).to be_valid
      end
    end
  end

  describe "#create_matchings" do
    let(:round2) { Round::ROUND2 }
    let(:round) { Round::ROUND3 }
    let(:matches) { Round::ROUND3.matches.order(:match_number).to_a }
    let(:force) { false }

    let!(:seeded_players) do
      create_list(:player, 7).each.with_index(1) do |player, rank|
        create(:yontaku_player_result, player:, rank:)
      end
    end

    let!(:round2_winners) do
      yontaku_rank = 8
      Round::ROUND2.matches.flat_map do |match|
        create_list(:player, 5).each.with_index(1) do |player, hayaoshi_rank|
          create(:yontaku_player_result, player:, rank: yontaku_rank)
          create(:matching, match:, player:, seat: hayaoshi_rank - 1, status: "win", rank: hayaoshi_rank)
          yontaku_rank += 1
        end
      end
    end

    before do
      (seeded_players + round2_winners).each do |player|
        create(
          :round3_course_preference,
          player:,
          choice1_match: matches[1],
          choice2_match: matches[0],
          choice3_match: matches[3],
          choice4_match: matches[2]
        )
      end
    end

    shared_examples "3Rの組分けが正しく作成されること" do
      it "3Rの組分けが正しく作成されること" do
        Matchmaking::Round3.create!(force:)

        matchings = matches[0].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq round2_winners[1, 8].map(&:id)

        matchings = matches[1].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq (seeded_players + round2_winners[0, 1]).map(&:id)

        matchings = matches[2].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq round2_winners[17, 8].map(&:id)

        matchings = matches[3].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq round2_winners[9, 8].map(&:id)
      end
    end

    context "マッチングが存在しない場合" do
      it_behaves_like "3Rの組分けが正しく作成されること"
    end

    context "マッチングが存在する場合" do
      before do
        matches[0].matchings.create!(player: create(:player), seat: 0)
      end

      it "エラーになること" do
        m = Matchmaking::Round3.new
        expect { m.save }.not_to(change { Round::ROUND3.matchings.count })
        expect(m.errors).to be_added(:base, "3Rのマッチングが既に存在します")
      end

      context "force: trueを指定したとき" do
        let(:force) { true }

        it_behaves_like "3Rの組分けが正しく作成されること"
      end
    end
  end
end

require "rails_helper"

RSpec.describe Matchmaking::Semifinal, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "#matching_should_not_exist" do
    let(:matchmaking) { Matchmaking::Semifinal.new }

    context "準決勝のマッチングが既に存在する場合" do
      let(:round) { Round::SEMIFINAL }
      let(:match) { Round::SEMIFINAL.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが失敗すること" do
        expect(matchmaking).to be_invalid
        expect(matchmaking.errors[:base]).to include "準決勝のマッチングが既に存在します"
      end
    end

    context "準決勝のマッチングが存在しない場合" do
      it "バリデーションが成功すること" do
        expect(matchmaking).to be_valid
      end
    end

    context "準決勝のマッチングが存在しないが3Rのマッチングが存在する場合" do
      let(:round) { Round::QUARTERFINAL }
      let(:match) { Round::QUARTERFINAL.matches[0] }

      before do
        create(:matching, match:)
      end

      it "バリデーションが成功すること" do
        expect(matchmaking).to be_valid
      end
    end
  end

  describe "#create_matchings" do
    let(:round) { Round::SEMIFINAL }
    let(:matches) { Round::SEMIFINAL.matches.order(:match_number).to_a }
    let(:force) { false }

    let!(:qf_winners) do
      yontaku_rank = 1
      Round::QUARTERFINAL.matches.flat_map do |match|
        create_list(:player, 4).each.with_index(1) do |player, hayaoshi_rank|
          create(:yontaku_player_result, player:, rank: yontaku_rank)
          create(:matching, match:, player:, seat: hayaoshi_rank - 1, status: "win", rank: hayaoshi_rank)
          yontaku_rank += 1
        end
      end
    end

    shared_examples "準決勝の組分けが正しく作成されること" do
      it "準決勝の組分けが正しく作成されること" do
        Matchmaking::Semifinal.create!(force:)

        matchings = matches[0].matchings.order(:seat).preload(player: :yontaku_player_result)
        expect(matchings.map(&:seat)).to eq [*0..7]
        expect(matchings.map(&:points)).to eq [0] * 8
        expect(matchings.map(&:misses)).to eq [0] * 8
        expect(matchings.map(&:status)).to eq ["playing"] * 8
        expect(matchings.map(&:player_id)).to eq qf_winners.map(&:id)
      end
    end

    context "マッチングが存在しない場合" do
      it_behaves_like "準決勝の組分けが正しく作成されること"
    end

    context "マッチングが存在する場合" do
      before do
        matches[0].matchings.create!(player: create(:player), seat: 0)
      end

      it "エラーになること" do
        m = Matchmaking::Semifinal.new
        expect { m.save }.not_to(change { Round::SEMIFINAL.matchings.count })
        expect(m.errors).to be_added(:base, "準決勝のマッチングが既に存在します")
      end

      context "force: trueを指定したとき" do
        let(:force) { true }

        it_behaves_like "準決勝の組分けが正しく作成されること"
      end
    end
  end
end

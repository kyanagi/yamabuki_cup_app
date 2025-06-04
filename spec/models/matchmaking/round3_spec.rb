require "rails_helper"

RSpec.describe Matchmaking::Round3, type: :model do
  before do
    Rails.application.load_seed
  end

  describe "#matching_should_not_exist" do
    let(:matchmaking) { Matchmaking::Round3.new }

    before do
      1.upto(7) do |i|
        create(:yontaku_player_result, rank: i)
      end

      yontaku_rank = 8
      Round::ROUND2.matches.flat_map do |match|
        score_operation = create(:score_operation, match:)
        match.update!(last_score_operation: score_operation)
        create_list(:player, 14).each.with_index(1) do |player, hayaoshi_rank|
          create(:yontaku_player_result, player:, rank: yontaku_rank)
          matching = create(:matching, match:, player:, seat: hayaoshi_rank - 1)
          create(:score, score_operation:, matching:, status: hayaoshi_rank <= 5 ? "win" : "playing", rank: hayaoshi_rank)
          yontaku_rank += 1
        end
      end
    end

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
        score_operation = create(:score_operation, match:)
        match.update!(last_score_operation: score_operation)
        create_list(:player, 5).each.with_index(1) do |player, hayaoshi_rank|
          create(:yontaku_player_result, player:, rank: yontaku_rank)
          matching = create(:matching, match:, player:, seat: hayaoshi_rank - 1)
          create(:score, score_operation:, matching:, status: "win", rank: hayaoshi_rank)
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

        matches.each(&:reload)

        scores = matches[0].current_scores.preload(:matching).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..7]
        expect(scores.map(&:points)).to eq [0] * 8
        expect(scores.map(&:misses)).to eq [0] * 8
        expect(scores.map(&:status)).to eq ["playing"] * 8
        expect(scores.map { |s| s.matching.player_id }).to eq round2_winners[1, 8].map(&:id)

        scores = matches[1].current_scores.preload(:matching).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..7]
        expect(scores.map(&:points)).to eq [0] * 8
        expect(scores.map(&:misses)).to eq [0] * 8
        expect(scores.map(&:status)).to eq ["playing"] * 8
        expect(scores.map { |s| s.matching.player_id }).to eq (seeded_players + round2_winners[0, 1]).map(&:id)

        scores = matches[2].current_scores.preload(:matching).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..7]
        expect(scores.map(&:points)).to eq [0] * 8
        expect(scores.map(&:misses)).to eq [0] * 8
        expect(scores.map(&:status)).to eq ["playing"] * 8
        expect(scores.map { |s| s.matching.player_id }).to eq round2_winners[17, 8].map(&:id)

        scores = matches[3].current_scores.preload(:matching).sort_by { it.matching.seat }
        expect(scores.map { |s| s.matching.seat }).to eq [*0..7]
        expect(scores.map(&:points)).to eq [0] * 8
        expect(scores.map(&:misses)).to eq [0] * 8
        expect(scores.map(&:status)).to eq ["playing"] * 8
        expect(scores.map { |s| s.matching.player_id }).to eq round2_winners[9, 8].map(&:id)
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

  context "2Rの勝者が25人揃っていない場合" do
    let(:matchmaking) { Matchmaking::Round3.new(force: force) }
    let(:force) { false }

    before do
      yontaku_rank = 8
      Round::ROUND2.matches.flat_map do |match|
        score_operation = create(:score_operation, match:)
        match.update!(last_score_operation: score_operation)
        create_list(:player, 4).each.with_index(1) do |player, hayaoshi_rank|
          create(:yontaku_player_result, player:, rank: yontaku_rank)
          matching = create(:matching, match:, player:, seat: hayaoshi_rank - 1)
          create(:score, score_operation:, matching:, status: "win", rank: hayaoshi_rank)
          yontaku_rank += 1
        end
      end
    end

    it "バリデーションが失敗し、エラーメッセージが追加されること" do
      expect(matchmaking).to be_invalid
      expect(matchmaking.errors[:base]).to include "2Rの勝者がそろっていません。"
    end
  end
end

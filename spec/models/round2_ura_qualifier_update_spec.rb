require "rails_helper"

RSpec.describe Round2UraQualifierUpdate, type: :model do
  def create_round2_ura_match_with_participants(count: 12)
    match = create(:match, rule_name: "MatchRule::Round2Ura")
    matchings = count.times.map do |i|
      create(:matching, match: match, seat: i + 1)
    end
    MatchOpening.create!(match: match)
    [match.reload, matchings]
  end

  describe "create" do
    context "4名の勝抜け者を指定して保存する場合" do
      it "Scoreが全参加者分作成される" do
        match, matchings = create_round2_ura_match_with_participants

        rank_by_matching_id = {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
          matchings[2].id.to_s => "3",
          matchings[3].id.to_s => "4",
        }

        expect do
          Round2UraQualifierUpdate.create!(match: match, rank_by_matching_id: rank_by_matching_id)
        end.to change(Score, :count).by(12)
      end

      it "勝抜け者のscoreはstatus=win, rank=1..4, points=0, misses=0で保存される" do
        match, matchings = create_round2_ura_match_with_participants

        rank_by_matching_id = {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
          matchings[2].id.to_s => "3",
          matchings[3].id.to_s => "4",
        }

        update_op = Round2UraQualifierUpdate.create!(match: match, rank_by_matching_id: rank_by_matching_id)
        scores = update_op.scores.where(matching: matchings[0..3]).order(:rank)

        expect(scores.pluck(:status).uniq).to eq(["win"])
        expect(scores.pluck(:rank)).to eq([1, 2, 3, 4])
        expect(scores.pluck(:points).uniq).to eq([0])
        expect(scores.pluck(:misses).uniq).to eq([0])
      end

      it "非勝抜け者のscoreはstatus=lose, rank=nil, points=0, misses=0で保存される" do
        match, matchings = create_round2_ura_match_with_participants

        rank_by_matching_id = {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
          matchings[2].id.to_s => "3",
          matchings[3].id.to_s => "4",
        }

        update_op = Round2UraQualifierUpdate.create!(match: match, rank_by_matching_id: rank_by_matching_id)
        loser_scores = update_op.scores.where(matching: matchings[4..])

        expect(loser_scores.pluck(:status).uniq).to eq(["lose"])
        expect(loser_scores.pluck(:rank).uniq).to eq([nil])
        expect(loser_scores.pluck(:points).uniq).to eq([0])
        expect(loser_scores.pluck(:misses).uniq).to eq([0])
      end

      it "matchのlast_score_operationが更新される" do
        match, matchings = create_round2_ura_match_with_participants

        rank_by_matching_id = {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
          matchings[2].id.to_s => "3",
          matchings[3].id.to_s => "4",
        }

        update_op = Round2UraQualifierUpdate.create!(match: match, rank_by_matching_id: rank_by_matching_id)
        expect(match.reload.last_score_operation).to eq(update_op)
      end

      it "ScoreOperationのpathが正しく設定される（immutable audit trail）" do
        match, matchings = create_round2_ura_match_with_participants
        previous_op = match.last_score_operation

        rank_by_matching_id = {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
          matchings[2].id.to_s => "3",
          matchings[3].id.to_s => "4",
        }

        update_op = Round2UraQualifierUpdate.create!(match: match, rank_by_matching_id: rank_by_matching_id)
        expect(update_op.path).to include(previous_op.id.to_s)
      end
    end

    context "再編集（上書き保存）する場合" do
      it "最新の勝抜け者情報で上書きされる" do
        match, matchings = create_round2_ura_match_with_participants

        rank_by_matching_id_first = {
          matchings[0].id.to_s => "1",
          matchings[1].id.to_s => "2",
          matchings[2].id.to_s => "3",
          matchings[3].id.to_s => "4",
        }
        Round2UraQualifierUpdate.create!(match: match, rank_by_matching_id: rank_by_matching_id_first)

        rank_by_matching_id_second = {
          matchings[4].id.to_s => "1",
          matchings[5].id.to_s => "2",
          matchings[6].id.to_s => "3",
          matchings[7].id.to_s => "4",
        }
        second_update_op = Round2UraQualifierUpdate.create!(match: match.reload, rank_by_matching_id: rank_by_matching_id_second)

        new_winner_scores = second_update_op.scores.where(matching: matchings[4..7]).order(:rank)
        expect(new_winner_scores.pluck(:status).uniq).to eq(["win"])
        expect(new_winner_scores.pluck(:rank)).to eq([1, 2, 3, 4])
      end
    end
  end
end

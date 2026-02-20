require "rails_helper"

RSpec.describe ScoreUndo, type: :model do
  let(:match) { create(:match) }
  let(:players) { create_list(:player, 3) }

  let(:matchings) do
    Array.new(players.size) do |i|
      create(:matching, match:, seat: i, player: players[i])
    end
  end

  let(:score_operations) do
    create_list(:score_operation, 5, match:).tap do |ops|
      ops.each_cons(2) do |op1, op2|
        op2.update!(path: "#{op1.path},#{op1.id}")
      end
    end
  end

  before do
    match.update!(last_score_operation: score_operations.last)
  end

  it "Match#last_score_operationが、1つ前のScoreOperationに更新されること" do
    expect { ScoreUndo.create!(match:) }.to change { match.reload.last_score_operation }.to(score_operations[-2])
  end

  it "undoしたScoreOperationが削除されること" do
    undoing_operation = score_operations.last
    expect { ScoreUndo.create!(match:) }.to change { ScoreOperation.exists?(undoing_operation.id) }.from(true).to(false)
  end

  it "undoしたScoreOperationに関連するQuestionAllocationが削除されること" do
    question_result = create(:question_result, match:)
    question_allocation = create(:question_allocation, question_result:)
    undoing_operation = create(:score_operation, match:, question_result:)
    match.update!(last_score_operation: undoing_operation)

    expect { ScoreUndo.create!(match:) }.to change { QuestionAllocation.exists?(question_allocation.id) }.from(true).to(false)
  end

  it "自由編集オペレーションをundoできること" do
    round2_match = create(:match, rule_name: "MatchRule::Round2Omote")
    matchings = 10.times.map do |i|
      create(:matching, match: round2_match, seat: i + 1)
    end
    opening_operation = MatchOpening.create!(match: round2_match)

    score_attributes_by_matching_id = matchings.each_with_index.with_object({}) do |(matching, i), hash|
      hash[matching.id.to_s] = {
        status: i < 4 ? "win" : "lose",
        points: i,
        misses: i % 2,
        rank: i < 4 ? i + 1 : nil,
        stars: 0,
      }
    end

    free_edit_operation = ScoreFreeEditOperation.create!(
      match: round2_match.reload,
      score_attributes_by_matching_id: score_attributes_by_matching_id
    )

    expect { ScoreUndo.create!(match: round2_match.reload) }.to change {
      ScoreOperation.exists?(free_edit_operation.id)
    }.from(true).to(false)
    expect(round2_match.reload.last_score_operation).to eq(opening_operation)
  end
end

require "rails_helper"

RSpec.describe ScoreFreeEditOperation, type: :model do
  def create_round2_omote_match_with_participants(count: 10)
    match = create(:match, rule_name: "MatchRule::Round2Omote")
    matchings = count.times.map do |i|
      create(:matching, match: match, seat: i + 1)
    end
    MatchOpening.create!(match: match)
    [match.reload, matchings]
  end

  def score_attributes_for(matchings, points_offset: 0)
    matchings.each_with_index.with_object({}) do |(matching, index), hash|
      hash[matching.id.to_s] = {
        status: index < 4 ? "win" : "lose",
        points: points_offset + index,
        misses: index % 3,
        rank: index < 4 ? index + 1 : nil,
        stars: 0,
      }
    end
  end

  describe "create" do
    it "全参加者分のScoreが作成される" do
      match, matchings = create_round2_omote_match_with_participants

      expect do
        described_class.create!(match: match, score_attributes_by_matching_id: score_attributes_for(matchings))
      end.to change(Score, :count).by(10)
    end

    it "指定した属性がScoreに保存される" do
      match, matchings = create_round2_omote_match_with_participants

      operation = described_class.create!(match: match, score_attributes_by_matching_id: score_attributes_for(matchings))
      first_score = operation.scores.find_by!(matching: matchings.first)

      expect(first_score.status).to eq("win")
      expect(first_score.points).to eq(0)
      expect(first_score.misses).to eq(0)
      expect(first_score.rank).to eq(1)
      expect(first_score.stars).to eq(0)
    end

    it "ScoreOperationのpathが接続される" do
      match, matchings = create_round2_omote_match_with_participants
      previous_operation = match.last_score_operation

      operation = described_class.create!(match: match, score_attributes_by_matching_id: score_attributes_for(matchings))

      expect(operation.path).to include(previous_operation.id.to_s)
    end

    it "match.last_score_operationが更新される" do
      match, matchings = create_round2_omote_match_with_participants

      operation = described_class.create!(match: match, score_attributes_by_matching_id: score_attributes_for(matchings))

      expect(match.reload.last_score_operation).to eq(operation)
    end

    it "再編集時に新しいスナップショットが積まれる" do
      match, matchings = create_round2_omote_match_with_participants

      described_class.create!(match: match, score_attributes_by_matching_id: score_attributes_for(matchings))
      second_operation = described_class.create!(
        match: match.reload,
        score_attributes_by_matching_id: score_attributes_for(matchings, points_offset: 100)
      )

      changed_score = second_operation.scores.find_by!(matching: matchings.first)
      expect(changed_score.points).to eq(100)
      expect(match.reload.last_score_operation).to eq(second_operation)
    end
  end
end

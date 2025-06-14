require "rails_helper"

RSpec.describe MatchClosing do
  let(:match) { create(:match) }
  let(:players) { create_list(:player, 3) }

  let(:matchings) do
    Array.new(players.size) do |i|
      create(:matching, match:, seat: i, player: players[i])
    end
  end
  let(:match_opening) { create(:score_operation, match:) }

  let(:match_closing) { build(:match_closing, match:) }

  before do
    match.update!(last_score_operation: match_opening)
    players.size.times do |i|
      create(:score, score_operation: match_opening, matching: matchings[i], **match.rule.initial_score_attributes_of(i))
    end
  end

  it "Scoreが作成されること" do
    expect { match_closing.save! }
      .to change(Score, :count).by(3)
  end

  it "Matchのlast_score_operationが更新されること" do
    expect { match_closing.save! }
      .to change { match.reload.last_score_operation }.to(match_closing)
  end

  it "pathが設定されること" do
    match_closing.save!
    expect(match_closing.path).to eq "#{match_opening.path},#{match_opening.id}"
  end

  it "MatchRuleのprocess_match_closingが呼ばれること" do
    rule = match.rule
    expect(rule).to receive(:process_match_closing) do |score_operation|
      expect(score_operation).to be_a MatchClosing
    end

    match_closing.save!
  end
end

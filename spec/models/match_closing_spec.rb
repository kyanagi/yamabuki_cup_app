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

  before do
    players.size.times do |i|
      create(:score, score_operation: match_opening, matching: matchings[i], **match.rule.initial_score_attributes_of(i))
    end
  end

  it "Scoreが作成されること" do
    expect { MatchClosing.create!(match:) }
      .to change(Score, :count).by(3)
  end

  it "MatchRuleのprocess_match_closingが呼ばれること" do
    rule = match.rule
    expect(rule).to receive(:process_match_closing) do |score_operation|
      expect(score_operation).to be_a MatchClosing
    end

    MatchClosing.create!(match:)
  end
end

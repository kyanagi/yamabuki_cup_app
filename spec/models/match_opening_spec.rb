require "rails_helper"

RSpec.describe MatchOpening do
  let(:match) { create(:match) }
  let(:players) { create_list(:player, 3) }

  let!(:matchings) do
    Array.new(players.size) do |i|
      create(:matching, match:, seat: i, player: players[i])
    end
  end
  let(:match_opening) { MatchOpening.new(match:) }

  it "Scoreが作成されること" do
    expect { match_opening.save! }
      .to change(Score, :count).by(3)
  end

  it "Matchのlast_score_operationが更新されること" do
    expect { match_opening.save! }
      .to change { match.reload.last_score_operation }.to(match_opening)
  end
end

require "rails_helper"

RSpec.describe ScoreOperation, type: :model do
  describe "#operation_history" do
    let(:match) { create(:match) }

    it "自身を含め、それまでに実行されたScoreOperationの一覧を新しい順に返すこと" do
      op1 = create(:score_operation, match:)
      op2 = create(:score_operation, match:, path: "#{op1.path},#{op1.id}")
      op3 = create(:score_operation, match:, path: "#{op2.path},#{op2.id}")
      expect(op3.operation_history).to eq([op3, op2, op1])
    end

    it "過去の履歴がない場合は、自身のみを返すこと" do
      op = create(:score_operation, match:)
      expect(op.operation_history).to eq([op])
    end
  end
end

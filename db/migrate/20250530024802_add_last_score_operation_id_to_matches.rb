class AddLastScoreOperationIdToMatches < ActiveRecord::Migration[7.0]
  def change
    add_reference :matches, :last_score_operation, null: true, foreign_key: { to_table: :score_operations }
  end
end

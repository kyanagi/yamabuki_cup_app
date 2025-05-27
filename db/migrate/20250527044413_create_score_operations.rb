class CreateScoreOperations < ActiveRecord::Migration[8.0]
  def change
    create_table :score_operations do |t|
      t.string :type
      t.references :match, null: false, foreign_key: true
      t.references :question_result, null: true, foreign_key: true
      t.references :previous_score_operation, null: true, foreign_key: { to_table: :score_operations }

      t.timestamps
    end
  end
end

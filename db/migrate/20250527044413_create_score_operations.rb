class CreateScoreOperations < ActiveRecord::Migration[8.0]
  def change
    create_table :score_operations do |t|
      t.string :type
      t.references :match, null: false, foreign_key: true
      t.references :question_result, null: true, foreign_key: true
      t.text :path, comment: "ScoreOperationの履歴のパス。idをカンマ区切りにしたもの。自分自身は含まない。"

      t.timestamps
    end
  end
end

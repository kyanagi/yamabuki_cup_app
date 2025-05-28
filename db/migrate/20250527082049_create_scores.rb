class CreateScores < ActiveRecord::Migration[8.0]
  def change
    create_table :scores do |t|
      t.references :matching, null: false, foreign_key: true
      t.references :score_operation, null: false, foreign_key: true
      t.string :status, comment: "選手の状態：通常、誤答休み、勝ち抜け、失格 など"
      t.integer :points, null: false, default: 0, comment: "得点"
      t.integer :misses, null: false, default: 0, comment: "誤答数"
      t.integer :stars, null: false, default: 0, comment: "星の数（決勝）"
      t.integer :rank, null: true,comment: "この試合における順位"

      t.timestamps

      t.index [:score_operation_id, :matching_id], unique: true
    end
  end
end

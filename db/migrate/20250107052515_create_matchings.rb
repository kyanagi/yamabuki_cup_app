class CreateMatchings < ActiveRecord::Migration[8.0]
  def change
    create_table :matchings, comment: "試合に対する選手のマッチング" do |t|
      t.references :match, null: false, foreign_key: true, comment: "matches.id"
      t.integer :seat, null: false, comment: "座席番号 (0-based)"
      t.references :player, null: false, foreign_key: true, comment: "players.id"
      t.string :status, comment: "選手の状態：通常、誤答休み、勝ち抜け、失格 など"
      t.integer :points, null: false, default: 0, comment: "得点"
      t.integer :misses, null: false, default: 0, comment: "誤答数"
      t.integer :stars, null: false, default: 0, comment: "星の数（決勝）"
      t.integer :rank, null: true,comment: "この試合における順位"

      t.timestamps

      t.index [:match_id, :player_id], unique: true
    end
  end
end

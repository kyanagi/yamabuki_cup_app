class CreateMatchings < ActiveRecord::Migration[8.0]
  def change
    create_table :matchings, comment: "試合に対する選手のマッチング" do |t|
      t.references :match, null: false, foreign_key: true, comment: "matches.id"
      t.integer :seat, null: false, comment: "座席番号 (0-based)"
      t.references :player, null: false, foreign_key: true, comment: "players.id"

      t.timestamps

      t.index [:match_id, :player_id], unique: true
    end
  end
end

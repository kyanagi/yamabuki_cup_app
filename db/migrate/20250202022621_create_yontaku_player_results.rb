class CreateYontakuPlayerResults < ActiveRecord::Migration[8.0]
  def change
    create_table :yontaku_player_results, comment: "ペーパー結果（点数・順位）" do |t|
      t.references :player, null: false, foreign_key: true, index: { unique: true }, comment: "players.id"
      t.integer :rank, null: false, index: { unique: true }, comment: "順位"
      t.integer :score, null: false, default: 0, comment: "得点"

      t.timestamps
    end
  end
end

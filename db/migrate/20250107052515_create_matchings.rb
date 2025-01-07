class CreateMatchings < ActiveRecord::Migration[8.0]
  def change
    create_table :matchings, comment: "試合に対する選手のマッチング" do |t|
      t.integer :match_id, null: false, index: true, comment: "matches.id"
      t.references :player, null: false, foreign_key: true, comment: "players.id"

      t.timestamps
    end
  end
end

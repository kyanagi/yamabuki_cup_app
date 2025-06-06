class CreateYontakuPlayerPapers < ActiveRecord::Migration[8.0]
  def change
    create_table :yontaku_player_papers do |t|
      t.references :player, null: false, foreign_key: true
      t.integer :paper_number, null: false
      t.text :answers

      t.timestamps

      t.index [:player_id, :paper_number], unique: true
    end
  end
end

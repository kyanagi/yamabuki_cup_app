class CreateMatches < ActiveRecord::Migration[8.0]
  def change
    create_table :matches, comment: "試合" do |t|
      t.integer :round_id, null: false, comment: "rounds.id"
      t.string :name, null: false, default: "", comment: "試合名"
      t.string :rule_name, null: false, default: "", comment: "ルールのクラス名"

      t.timestamps
    end
  end
end

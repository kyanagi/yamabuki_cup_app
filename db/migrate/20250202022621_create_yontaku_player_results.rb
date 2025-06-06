class CreateYontakuPlayerResults < ActiveRecord::Migration[8.0]
  def change
    create_table :yontaku_player_results, comment: "ペーパー結果（点数・順位）" do |t|
      t.references :player, null: false, foreign_key: true, index: { unique: true }, comment: "players.id"
      t.integer :rank, null: false, index: { unique: true }, comment: "順位"
      t.integer :score, null: false, comment: "得点"
      t.integer :approximation_quiz_diff1, null: false, comment: "近似値クイズ1の誤差"
      t.integer :approximation_quiz_diff2, null: false, comment: "近似値クイズ2の誤差"
      t.integer :tiebreaker, null: false, index: { unique: true }, comment: "近似値まで同点だったときの抽選番号"

      t.timestamps
    end
  end
end

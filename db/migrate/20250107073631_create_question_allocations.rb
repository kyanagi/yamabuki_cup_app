class CreateQuestionAllocations < ActiveRecord::Migration[8.0]
  def change
    create_table :question_allocations, comment: "試合ごとの出題問題の割り振り" do |t|
      t.references :match, null: false, foreign_key: true, comment: "matches.id"
      t.references :question, null: false, index: { unique: true }, foreign_key: true, comment: "questions.id"
      t.integer :order, null: false, comment: "出題順"

      t.timestamps

      t.index [:match_id, :order], unique: true
    end
  end
end

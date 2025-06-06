class CreateYontakuQuestions < ActiveRecord::Migration[8.0]
  def change
    create_table :yontaku_questions, comment: "四択クイズの問題" do |t|
      t.string :text, null: false, default: "", comment: "問題文"
      t.string :choice1, null: false, default: "", comment: "選択肢1"
      t.string :choice2, null: false, default: "", comment: "選択肢2"
      t.string :choice3, null: false, default: "", comment: "選択肢3"
      t.string :choice4, null: false, default: "", comment: "選択肢4"
      t.integer :answer, null: false, comment: "正解の選択肢番号（1-4）"

      t.timestamps

      t.check_constraint "answer IN (1, 2, 3, 4)", name: "answer_in_choices"
    end
  end
end

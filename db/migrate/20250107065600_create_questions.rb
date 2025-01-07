class CreateQuestions < ActiveRecord::Migration[8.0]
  def change
    create_table :questions, comment: "クイズ問題" do |t|
      t.string :text, null: false, default: "", comment: "問題文"
      t.string :answer, null: false, default: "", comment: "正解"
      t.string :another_answer, null: false, default: "", comment: "別解"
      t.string :note, null: false, default: "", comment: "備考"

      t.timestamps
    end
  end
end

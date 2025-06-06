class CreateApproximationQuestions < ActiveRecord::Migration[8.0]
  def change
    create_table :approximation_questions, comment: "近似値クイズの問題" do |t|
      t.string :text, null: false, default: "", comment: "問題文"
      t.integer :answer, null: false, comment: "正解値"

      t.timestamps
    end
  end
end

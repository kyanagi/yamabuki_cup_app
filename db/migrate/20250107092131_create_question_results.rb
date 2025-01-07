class CreateQuestionResults < ActiveRecord::Migration[8.0]
  def change
    create_table :question_results, comment: "出題結果" do |t|
      t.references :question_allocation, null: false, foreign_key: true, comment: "question_allocations.id"

      t.timestamps
    end
  end
end

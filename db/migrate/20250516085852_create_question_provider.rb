class CreateQuestionProvider < ActiveRecord::Migration[8.0]
  def change
    create_table :question_providers do |t|
      t.references :next_question, null: false, foreign_key: { to_table: :questions }

      t.timestamps
    end
  end
end

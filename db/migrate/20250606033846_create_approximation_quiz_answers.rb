class CreateApproximationQuizAnswers < ActiveRecord::Migration[8.0]
  def change
    create_table :approximation_quiz_answers do |t|
      t.references :player, null: false, foreign_key: true, index: { unique: true }
      t.integer :answer1
      t.integer :answer2

      t.timestamps
    end
  end
end

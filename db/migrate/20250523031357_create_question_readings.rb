class CreateQuestionReadings < ActiveRecord::Migration[8.0]
  def change
    create_table :question_readings do |t|
      t.references :question, null: false, foreign_key: true
      t.float :read_duration
      t.float :full_duration

      t.timestamps

      t.index :created_at
    end
  end
end

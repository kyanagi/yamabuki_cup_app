class CreateRound3CoursePreferences < ActiveRecord::Migration[8.0]
  def change
    create_table :round3_course_preferences do |t|
      t.references :player, null: false, foreign_key: true
      t.references :choice1_match, null: false, foreign_key: { to_table: :matches }
      t.references :choice2_match, null: false, foreign_key: { to_table: :matches }
      t.references :choice3_match, null: false, foreign_key: { to_table: :matches }
      t.references :choice4_match, null: false, foreign_key: { to_table: :matches }

      t.timestamps
    end
  end
end

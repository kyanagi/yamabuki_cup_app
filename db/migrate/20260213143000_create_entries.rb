class CreateEntries < ActiveRecord::Migration[8.1]
  def change
    create_table :entries do |t|
      t.references :player, null: false, foreign_key: true, index: { unique: true }
      t.integer :entry_phase, null: false
      t.integer :status, null: false, default: 0
      t.integer :priority

      t.timestamps
    end

    change_table :entries, bulk: true do |t|
      t.index :status
      t.index :priority, unique: true, where: "priority IS NOT NULL"
    end
    add_check_constraint :entries, "priority IS NULL OR priority > 0", name: "chk_entries_priority_positive"
  end
end

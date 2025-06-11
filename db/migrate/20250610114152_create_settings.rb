class CreateSettings < ActiveRecord::Migration[8.0]
  def change
    create_table :settings do |t|
      t.json :value, null: false, default: {}
      t.timestamps
    end
  end
end

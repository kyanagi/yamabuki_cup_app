class CreatePlayerProfiles < ActiveRecord::Migration[8.0]
  def change
    create_table :player_profiles do |t|
      t.references :player, null: false, foreign_key: true, index: { unique: true }
      t.string :entry_list_name, null: false, default: ""
      t.string :family_name, null: false, default: ""
      t.string :family_name_kana, null: false, default: ""
      t.string :given_name, null: false, default: ""
      t.string :given_name_kana, null: false, default: ""

      t.timestamps
    end
  end
end

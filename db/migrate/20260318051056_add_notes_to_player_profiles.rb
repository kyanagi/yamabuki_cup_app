class AddNotesToPlayerProfiles < ActiveRecord::Migration[8.1]
  def change
    add_column :player_profiles, :notes, :text, null: false, default: ""
  end
end

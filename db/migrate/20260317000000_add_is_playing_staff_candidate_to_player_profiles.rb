class AddIsPlayingStaffCandidateToPlayerProfiles < ActiveRecord::Migration[8.1]
  def change
    add_column :player_profiles, :is_playing_staff_candidate, :boolean, null: false, default: false
  end
end

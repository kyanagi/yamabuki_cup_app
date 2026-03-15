class EntriesController < PublicController
  allow_unauthenticated_access only: :index

  def index
    entries = Entry.includes(player: :player_profile)
    @entries = entries.public_entry_list
    @waitlisted_entries = entries.waitlisted_for_entry_list
  end
end

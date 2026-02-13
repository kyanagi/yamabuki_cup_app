class EntriesController < PublicController
  allow_unauthenticated_access only: :index

  def index
    @entries = Entry.for_entry_list.includes(player: :player_profile)
  end
end

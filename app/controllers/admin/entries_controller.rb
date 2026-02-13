module Admin
  class EntriesController < AdminController
    def index
      @entries = Entry.includes(player: :player_profile).order(Arel.sql("CASE WHEN priority IS NULL THEN 1 ELSE 0 END"), :priority, :id)
    end

    def cancel
      entry = Entry.find(params[:id])

      if entry.cancellable?
        entry.cancel!
        flash.notice = "エントリーをキャンセルしました。"
      else
        flash.alert = "既にキャンセル済みのエントリーです。"
      end

      redirect_to admin_entries_path
    end
  end
end

module Admin
  class EntriesController < AdminController
    def index
      @priority_upload = EntryPriorityUpload.new
      setup_index_instance_variables
    end

    def upload_priorities
      csv_data = params.dig(:entry_priority_upload, :csv_file)&.read
      if csv_data.blank?
        flash.now.alert = "CSVファイルが選択されていません。"
        @priority_upload = EntryPriorityUpload.new
        setup_index_instance_variables
        render :index, status: :unprocessable_entity
        return
      end

      @priority_upload = EntryPriorityUpload.new(csv_data:)

      if @priority_upload.save
        flash.notice = "#{@priority_upload.updated_count}件の優先順位を更新しました。"
        redirect_to admin_entries_path
      else
        flash.now.alert = @priority_upload.errors.full_messages.join("\n")
        setup_index_instance_variables
        render :index, status: :unprocessable_entity
      end
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

    private

    def setup_index_instance_variables
      @entries = Entry.for_entry_list.includes(player: :player_profile)
    end
  end
end

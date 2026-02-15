module Home
  class EntriesController < PublicController
    def cancel
      @entry = Current.player.entry
      if !entry_accessible?
        return
      end

      @entry_cancellation_form = EntryCancellationForm.new(entry: @entry)
    end

    def update_cancel
      @entry = Current.player.entry
      if !entry_accessible?
        return
      end

      @entry_cancellation_form = EntryCancellationForm.new(entry: @entry, **entry_cancellation_form_params)

      if @entry_cancellation_form.save
        terminate_session
        flash.notice = "エントリーをキャンセルしました。"
        redirect_to new_session_path
      else
        render :cancel, status: :unprocessable_entity
      end
    end

    private

    def entry_accessible?
      if !@entry
        flash.alert = "エントリー情報が見つかりません。"
        redirect_to home_path
        return false
      end

      if !@entry.cancellable?
        flash.alert = "既にキャンセル済みです。"
        redirect_to home_path
        return false
      end

      true
    end

    def entry_cancellation_form_params
      params.fetch(:entry_cancellation_form, {}).permit(:confirmation_text)
    end
  end
end

module Home
  class EntriesController < PublicController
    def cancel
      entry = Current.player.entry

      if !entry
        flash.alert = "エントリー情報が見つかりません。"
      elsif !entry.cancellable?
        flash.alert = "既にキャンセル済みです。"
      else
        entry.cancel!
        flash.notice = "エントリーをキャンセルしました。"
      end

      redirect_to home_path
    end
  end
end

# テスト環境以外でブロードキャスタを起動する。
# テスト環境では各テストが独立したインスタンスを生成するため除外する。
unless Rails.env.test?
  if Rails.env.development?
    # before_class_unload: Zeitwerk がクラスを unload する直前（旧クラスがまだ有効なタイミング）で
    # 旧インスタンスの AS::Notifications 購読を解放する。
    # to_prepare 時点では Zeitwerk がクラスを再定義済みのため reset! が旧インスタンスに届かない。
    ActiveSupport::Reloader.before_class_unload do
      Scoreboard::EventBroadcaster.reset!
    end

    # to_prepare: クラス再読み込み完了後に新インスタンスを起動する。
    # after_initialize は起動時にしか走らないため、リロード後の再起動はここで行う。
    Rails.application.config.to_prepare do
      Scoreboard::EventBroadcaster.instance
    end
  end

  Rails.application.config.after_initialize do
    Scoreboard::EventBroadcaster.instance
  end
end

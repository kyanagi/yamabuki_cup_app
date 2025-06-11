# オンラインで変更可能なアプリ設定を格納するクラス
class Setting < ApplicationRecord
  # 設定値を表現する内部クラス
  Value = Data.define(:round3_course_preference_editable) do
    def initialize(round3_course_preference_editable: true)
      super
    end

    # 設定を保存する
    # @rbs return void
    def save!
      s = Setting.first || Setting.new
      s.value = to_h
      s.save!
    end
  end

  class << self
    def round3_course_preference_editable? #: bool
      value.round3_course_preference_editable
    end

    def update!(attributes) #: void
      value.with(**attributes).save!
    end

    private

    def value #: Setting::Value
      Value.new(**(first&.value || {}).symbolize_keys)
    end
  end
end

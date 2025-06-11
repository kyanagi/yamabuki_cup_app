# オンラインで変更可能なアプリ設定を格納するクラス
class Setting < ApplicationRecord
  # 設定名とデフォルト値のペア
  ATTRIBUTES = [
    [:registerable, true],
    [:round3_course_preference_editable, true],
  ]

  # 設定値を表現する内部クラス
  Value = Data.define(*ATTRIBUTES.map(&:first)) do
    def initialize(**kwargs)
      ATTRIBUTES.each do |attr, default_value|
        kwargs[attr] = default_value unless kwargs.key?(attr)
      end
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
    ATTRIBUTES.each do |attribute,|
      define_method(attribute) do
        value.send(attribute)
      end
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

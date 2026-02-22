# オンラインで変更可能なアプリ設定を格納するクラス
class Setting < ApplicationRecord
  # 設定名とデフォルト値のペア
  ATTRIBUTES = [
    [:registerable, true],
    [:round3_course_preference_editable, true],
    [:round2_group_visible_on_mypage, false],
    [:capacity, 0],
    [:entry_phase, nil],
  ]

  ENTRY_PHASE_VALUES = ["primary", "secondary"].freeze

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
      normalized_attributes = normalize_attributes(attributes.symbolize_keys)
      value.with(**normalized_attributes).save!
    end

    private

    def normalize_attributes(attributes)
      normalized = attributes.dup

      if normalized.key?(:registerable)
        normalized[:registerable] = cast_boolean!("registerable", normalized[:registerable])
      end

      if normalized.key?(:round3_course_preference_editable)
        normalized[:round3_course_preference_editable] = cast_boolean!(
          "round3_course_preference_editable",
          normalized[:round3_course_preference_editable]
        )
      end

      if normalized.key?(:round2_group_visible_on_mypage)
        normalized[:round2_group_visible_on_mypage] = cast_boolean!(
          "round2_group_visible_on_mypage",
          normalized[:round2_group_visible_on_mypage]
        )
      end

      if normalized.key?(:capacity)
        normalized[:capacity] = cast_capacity!(normalized[:capacity])
      end

      if normalized.key?(:entry_phase)
        normalized[:entry_phase] = cast_entry_phase!(normalized[:entry_phase])
      end

      normalized
    end

    def cast_boolean!(name, value)
      return value if value.in?([true, false])

      raise ArgumentError, "#{name} は true/false で指定してください"
    end

    def cast_capacity!(value)
      capacity = Integer(value, exception: false)
      if !capacity || capacity < 0
        raise ArgumentError, "capacity は0以上の整数で指定してください"
      end

      capacity
    end

    def cast_entry_phase!(value)
      return nil if value.nil? || value == ""

      phase = value.to_s
      if !phase.in?(ENTRY_PHASE_VALUES)
        raise ArgumentError, "entry_phase は primary / secondary / nil のいずれかで指定してください"
      end

      phase
    end

    def value #: Setting::Value
      Value.new(**(first&.value || {}).symbolize_keys)
    end
  end
end

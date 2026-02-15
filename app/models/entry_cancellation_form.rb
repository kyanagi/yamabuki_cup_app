class EntryCancellationForm < ActiveType::Object
  attribute :confirmation_text, :string

  attr_accessor :entry

  validate :validate_entry
  validate :validate_confirmation_text

  def save
    return false if invalid?

    entry.cancel!
    true
  rescue ActiveRecord::RecordInvalid
    errors.add(:base, "エントリーのキャンセルに失敗しました。")
    false
  end

  private

  def validate_entry
    if entry.blank?
      errors.add(:base, "エントリー情報が見つかりません。")
      return
    end

    if !entry.cancellable?
      errors.add(:base, "既にキャンセル済みです。")
    end
  end

  def validate_confirmation_text
    if confirmation_text != "キャンセル"
      errors.add(:confirmation_text, "「キャンセル」と入力してください。")
    end
  end
end

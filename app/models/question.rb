class Question < ApplicationRecord
  has_one :question_allocation, dependent: :destroy
  has_one :match, through: :question_allocation

  # read_duration（秒）に基づいて問題文を読了部分と未読部分に分割する。
  # char_timestamps が nil または read_duration が正の値でない場合は全文を未読として扱う。
  def split_text_at(read_duration)
    duration = read_duration.presence&.to_f
    return { read_text: "", unread_text: text.to_s } unless duration&.positive?

    timestamps = char_timestamps.presence || []
    read_count = timestamps.count { |ct| ct["end"] <= duration }
    {
      read_text: text.to_s[0, read_count],
      unread_text: text.to_s[read_count..],
    }
  end
end

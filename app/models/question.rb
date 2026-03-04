class Question < ApplicationRecord
  has_one :question_allocation, dependent: :destroy
  has_one :match, through: :question_allocation

  # read_duration（秒、Numeric または nil）に基づいて問題文を読了部分と未読部分に分割する。
  # read_duration が nil、または char_timestamps が nil/空の場合は全文読了として扱う。
  def split_text_at(read_duration)
    return { read_text: text.to_s, unread_text: "" } if read_duration.nil? || char_timestamps.blank?

    read_count = char_timestamps.count { |ct| ct["end"] <= read_duration }
    {
      read_text: text.to_s[0, read_count],
      unread_text: text.to_s[read_count..],
    }
  end
end

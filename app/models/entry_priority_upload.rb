class EntryPriorityUpload < ActiveType::Object
  ParsedRow = Data.define(:entry_id, :priority)

  attribute :csv_data, :string

  validates :csv_data, presence: true
  validate :validate_rows

  before_save :process

  attr_reader :updated_count

  private

  def validate_rows
    return if csv_data.blank?

    if parsed_rows.empty?
      errors.add(:base, "CSVの形式が正しくありません。")
      return
    end

    validate_duplicate_entry_ids
    validate_duplicate_priorities
    validate_entry_ids_existence
    validate_priority_conflicts
  rescue CSV::MalformedCSVError
    errors.add(:base, "CSVの形式が正しくありません。")
  rescue Encoding::UndefinedConversionError, Encoding::InvalidByteSequenceError
    errors.add(:base, "CSVファイルの文字コードが不正です。")
  end

  def process
    now = Time.current

    Entry.transaction do
      Entry.lock.load

      target_entry_ids = parsed_rows.map(&:entry_id)
      target_entries = Entry.where(id: target_entry_ids).lock.index_by(&:id)

      Entry.where(id: target_entry_ids).update_all(priority: nil, updated_at: now)

      parsed_rows.each do |row|
        target_entries.fetch(row.entry_id).update!(priority: row.priority)
      end

      recalculate_statuses!(now:)
    end

    @updated_count = parsed_rows.size
  rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
    errors.add(:base, "優先順位の更新に失敗しました。")
    throw(:abort)
  end

  def recalculate_statuses!(now:)
    non_cancelled_entries = Entry.where.not(status: :cancelled)

    non_cancelled_entries.where(priority: nil).update_all(status: Entry.statuses[:pending], updated_at: now)

    prioritized_entries = non_cancelled_entries.where.not(priority: nil)
    prioritized_entries.update_all(status: Entry.statuses[:waitlisted], updated_at: now)

    accepted_ids = prioritized_entries.order(:priority, :id).limit(Setting.capacity.to_i).pluck(:id)
    Entry.where(id: accepted_ids).update_all(status: Entry.statuses[:accepted], updated_at: now) if accepted_ids.any?
  end

  def parsed_rows
    @parsed_rows ||= CSV.parse(normalized_csv_data).filter_map do |row|
      normalized_row = row.map { it.to_s.strip }
      next if normalized_row.all?(&:blank?)

      if normalized_row.size != 2
        errors.add(:base, "CSVの形式が正しくありません。")
        next
      end

      entry_id = Integer(normalized_row[0], exception: false)
      priority = Integer(normalized_row[1], exception: false)

      if !entry_id || entry_id <= 0 || !priority || priority <= 0
        errors.add(:base, "CSVの形式が正しくありません。")
        next
      end

      ParsedRow.new(entry_id:, priority:)
    end
  end

  def normalized_csv_data
    @normalized_csv_data ||= begin
      utf8_data = csv_data.to_s.dup.force_encoding(Encoding::UTF_8)
      encoded_data = if utf8_data.valid_encoding?
                       utf8_data
                     else
                       csv_data.to_s.encode("UTF-8", "CP932", invalid: :replace, undef: :replace)
                     end

      encoded_data.delete_prefix("\uFEFF")
    end
  end

  def validate_duplicate_entry_ids
    entry_ids = parsed_rows.map(&:entry_id)
    errors.add(:base, "CSV内でIDが重複しています。") if entry_ids.uniq.size != entry_ids.size
  end

  def validate_duplicate_priorities
    priorities = parsed_rows.map(&:priority)
    errors.add(:base, "CSV内で優先順位が重複しています。") if priorities.uniq.size != priorities.size
  end

  def validate_entry_ids_existence
    entry_ids = parsed_rows.map(&:entry_id)
    existing_entry_ids = Entry.where(id: entry_ids).pluck(:id)
    errors.add(:base, "CSVに存在しないIDが含まれています。") if existing_entry_ids.size != entry_ids.size
  end

  def validate_priority_conflicts
    entry_ids = parsed_rows.map(&:entry_id)
    priorities = parsed_rows.map(&:priority)

    conflicts = Entry.where(priority: priorities).where.not(id: entry_ids)
    errors.add(:base, "CSV外のエントリーと優先順位が重複しています。") if conflicts.exists?
  end
end

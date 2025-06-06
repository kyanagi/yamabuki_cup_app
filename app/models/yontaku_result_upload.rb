# アップロードされた四択クイズ採点結果を処理するクラス。
class YontakuResultUpload < ActiveType::Object
  attribute :csv_data, :string

  validates :csv_data, presence: true
  validate :valid_csv_data

  before_save :process

  attr_reader :imported_lines_count, :error_lines

  def process #: void
    upsert_records = []
    @error_lines = []

    question_count = rows[0].grep(/\A設問\d+\z/).size

    rows.each do |row|
      next unless /\A\d+\z/.match?(row[0])

      identification_number = row[0].to_s
      paper_number = identification_number[-1].to_i
      player_id = identification_number[0..-2].to_i

      player = Player.find_by(id: player_id)
      unless player
        @error_lines << row
        next
      end

      answers = row[3..]

      if answers.size != question_count
        @error_lines << row
        next
      end

      upsert_records << {
        player_id: player.id,
        paper_number: paper_number,
        answers: answers.to_json,
        created_at: Time.current,
        updated_at: Time.current,
      }
    end

    if upsert_records.any?
      YontakuPlayerPaper.upsert_all(
        upsert_records,
        unique_by: [:player_id, :paper_number]
      )
    end

    @imported_lines_count = upsert_records.size
  end

  private

  def valid_csv_data #: void
    unless rows[0][0, 3] == ["番号", "氏名", "得点"] && rows[0][3..].all? { |s| /\A設問\d+\z/.match?(s) }
      errors.add(:base, "CSVの形式が正しくありません。")
    end
  rescue CSV::MalformedCSVError
    errors.add(:base, "CSVファイルの形式が正しくありません。")
  rescue => e
    errors.add(:base, "CSVファイルの処理中にエラーが発生しました: #{e.message}")
  end

  def rows
    @rows ||= begin
      encoded_data = csv_data.encode("UTF-8", "CP932", invalid: :replace, undef: :replace)
      CSV.parse(encoded_data)
    end
  end
end

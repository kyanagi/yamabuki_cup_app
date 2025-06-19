class Registration < ActiveType::Object
  attribute :email, :string
  attribute :password, :string
  attribute :family_name, :string
  attribute :given_name, :string
  attribute :family_name_kana, :string
  attribute :given_name_kana, :string
  attribute :entry_list_name, :string
  attribute :notes, :text

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, presence: true
  validates :family_name, presence: true
  validates :given_name, presence: true
  validates :family_name_kana, presence: true
  validates :given_name_kana, presence: true
  validates :entry_list_name, presence: true

  validate :email_uniqueness

  before_save :create_player_data

  attr_reader :player

  private

  def email_uniqueness
    return if email.blank?

    if PlayerEmailCredential.exists?(email: email)
      errors.add(:email, "は既に登録されています。ログインページからログインしてください。")
    end
  end

  def create_player_data
    ActiveRecord::Base.transaction do
      @player = Player.create!
      PlayerEmailCredential.create!(player: @player, email:, password:, password_confirmation: password)
      PlayerProfile.create!(player: @player, family_name:, given_name:, family_name_kana:, given_name_kana:, entry_list_name:)

      attrs = [*1..4].zip(Round::ROUND3.matches).to_h { |i, match| ["choice#{i}_match", match] }
      Round3CoursePreference.create!(player: @player, **attrs)
    end
  end
end

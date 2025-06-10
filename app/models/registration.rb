class Registration < ActiveType::Object
  attribute :email, :string
  attribute :password, :string
  attribute :family_name, :string
  attribute :given_name, :string
  attribute :family_name_kana, :string
  attribute :given_name_kana, :string
  attribute :entry_list_name, :string
  attribute :notes, :text

  validates :email, presence: true
  validates :password, presence: true
  validates :family_name, presence: true
  validates :given_name, presence: true
  validates :family_name_kana, presence: true
  validates :given_name_kana, presence: true
  validates :entry_list_name, presence: true

  before_save :create_player_data

  attr_reader :player

  private

  def create_player_data
    ActiveRecord::Base.transaction do
      @player = Player.create!
      PlayerEmailCredential.create!(player: @player, email:, password:, password_confirmation: password)
      PlayerProfile.create!(player: @player, family_name:, given_name:, family_name_kana:, given_name_kana:, entry_list_name:)
    end
  end
end

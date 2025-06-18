class PlayerProfileEdit < ActiveType::Object
  attribute :player_id, :integer
  attribute :email, :string
  attribute :password, :string
  attribute :family_name, :string
  attribute :given_name, :string
  attribute :family_name_kana, :string
  attribute :given_name_kana, :string
  attribute :entry_list_name, :string

  belongs_to :player

  validates :email, presence: true
  validates :family_name, presence: true
  validates :given_name, presence: true
  validates :family_name_kana, presence: true
  validates :given_name_kana, presence: true
  validates :entry_list_name, presence: true

  before_save :update_player_data

  def initialize(attributes = {})
    if attributes[:player_id].present?
      player = Player.find(attributes[:player_id])
      profile = player.player_profile
      credential = player.player_email_credential

      defaults = {
        email: credential&.email,
        family_name: profile&.family_name,
        given_name: profile&.given_name,
        family_name_kana: profile&.family_name_kana,
        given_name_kana: profile&.given_name_kana,
        entry_list_name: profile&.entry_list_name,
      }

      super(defaults.merge(attributes))
    else
      super
    end
  end

  private

  def update_player_data
    ActiveRecord::Base.transaction do
      # Update PlayerProfile
      player.player_profile.update!(
        family_name:,
        given_name:,
        family_name_kana:,
        given_name_kana:,
        entry_list_name:
      )

      # Update PlayerEmailCredential
      credential_attrs = { email: }
      # Only update password if a new one is provided
      if password.present?
        credential_attrs[:password] = password
        credential_attrs[:password_confirmation] = password
      end

      player.player_email_credential.update!(credential_attrs)
    end
  end
end

class Registration < ActiveType::Object
  attribute :email, :string
  attribute :password, :string
  attribute :family_name, :string
  attribute :given_name, :string
  attribute :family_name_kana, :string
  attribute :given_name_kana, :string
  attribute :entry_list_name, :string
  attribute :notes, :text
end

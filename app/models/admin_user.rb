class AdminUser < ApplicationRecord
  has_secure_password
  has_many :admin_sessions, dependent: :destroy

  validates :username, presence: true, uniqueness: true
end

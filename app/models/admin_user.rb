class AdminUser < ApplicationRecord
  has_secure_password
  has_many :admin_sessions, dependent: :destroy

  enum :role, { admin: 0, staff: 1 }

  validates :username, presence: true, uniqueness: true
end

class PlayerEmailCredential < ApplicationRecord
  has_secure_password
  belongs_to :player
end

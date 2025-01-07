class Matching < ApplicationRecord
  extend ActiveHash::Associations::ActiveRecordExtensions

  belongs_to :match
  belongs_to :player
end

class Current < ActiveSupport::CurrentAttributes
  attribute :session
  delegate :player, to: :session, allow_nil: true
end

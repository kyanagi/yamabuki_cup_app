module AuthenticationHelper
  def after_authentication_url
    session.delete(:return_to_after_authenticating) || root_url
  end
end

RSpec.configure do |config|
  config.include AuthenticationHelper, type: :request
end

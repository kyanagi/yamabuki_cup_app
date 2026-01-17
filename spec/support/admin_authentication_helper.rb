module AdminAuthenticationHelper
  def sign_in_admin(admin_user = nil)
    admin_user ||= create(:admin_user, password: "password123")
    post admin_session_path, params: { username: admin_user.username, password: "password123" }
    admin_user
  end

  def sign_in_admin_via_page(admin_user = nil)
    admin_user ||= create(:admin_user, password: "password123")
    visit new_admin_session_path
    fill_in "username", with: admin_user.username
    fill_in "password", with: "password123"
    click_button "ログイン"
    expect(page).to have_current_path(admin_root_path)
    admin_user
  end
end

RSpec.configure do |config|
  config.include AdminAuthenticationHelper, type: :request
  config.include AdminAuthenticationHelper, type: :system
end

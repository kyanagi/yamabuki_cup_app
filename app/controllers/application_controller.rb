class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  before_action :validate_sec_fetch_site

  ALLOWED_ORIGINS = [] # TODO
  SEC_FETCH_SITE_ALLOWED_VALUES = ["same-origin", "same-site"]

  private

  def validate_origin
    return if request.get? || request.head?

    origin = request.headers["Origin"]
    unless origin.present? && ALLOWED_ORIGINS.include?(origin)
      raise CsrfProtectionError
    end
  end

  def validate_sec_fetch_site
    return if request.get? || request.head?

    sec_fetch_site = request.headers["Sec-Fetch-Site"]
    if sec_fetch_site.present? && SEC_FETCH_SITE_ALLOWED_VALUES.exclude?(sec_fetch_site.downcase)
      raise CsrfProtectionError
    end
  end
end

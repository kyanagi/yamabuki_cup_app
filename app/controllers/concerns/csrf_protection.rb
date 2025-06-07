module CsrfProtection
  extend ActiveSupport::Concern

  included do
    # before_action :validate_origin
    before_action :validate_sec_fetch_site
  end

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

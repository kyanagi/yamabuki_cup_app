module CsrfProtection
  extend ActiveSupport::Concern

  included do
    before_action :validate_origin, if: -> { protect_against_forgery? }
    before_action :validate_sec_fetch_site, if: -> { protect_against_forgery? }
    rescue_from CsrfProtectionError, with: :handle_csrf_error
  end

  private

  def validate_origin
    return if request.get? || request.head?

    origin = request.headers["Origin"]
    raise CsrfProtectionError unless origin.present? && origin == request.base_url
  end

  def validate_sec_fetch_site
    return if request.get? || request.head?

    sec_fetch_site = request.headers["Sec-Fetch-Site"]
    if sec_fetch_site.present? && sec_fetch_site.downcase != "same-origin"
      raise CsrfProtectionError
    end
  end

  def handle_csrf_error
    render plain: "Bad Request", status: 400
  end
end

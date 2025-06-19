class PasswordsMailer < ApplicationMailer
  def reset(credential)
    @credential = credential
    mail subject: "【やまぶき杯】パスワード再設定のご案内", to: credential.email
  end
end

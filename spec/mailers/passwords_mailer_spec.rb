require "rails_helper"

RSpec.describe PasswordsMailer, type: :mailer do
  describe "#reset" do
    let(:player) { create(:player) }
    let(:credential) { create(:player_email_credential, player:) }
    let(:mail) { PasswordsMailer.reset(credential) }

    it "正しい件名でメールが作成される" do
      expect(mail.subject).to eq "【やまぶき杯】パスワード再設定のご案内"
    end

    it "正しい宛先でメールが作成される" do
      expect(mail.to).to eq [credential.email]
    end

    it "差出人が設定される" do
      expect(mail.from).to include("yamabuki@shakenbu.org")
    end

    it "メール本文にパスワード再設定URLが含まれている" do
      expect(mail.body.encoded).to match(%r{http://.*?/passwords/.*/edit})
    end
  end
end

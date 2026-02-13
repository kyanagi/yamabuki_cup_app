require "rails_helper"

RSpec.describe "Admin::Entries", type: :request do
  describe "GET /admin/entries" do
    context "未ログイン" do
      it "ログインページにリダイレクトされる" do
        get admin_entries_path

        expect(response).to redirect_to(new_admin_session_path)
      end
    end

    context "staff ロール" do
      before do
        sign_in_admin(create(:admin_user, role: :staff))
      end

      it "アクセスできる" do
        get admin_entries_path

        expect(response).to have_http_status(:ok)
      end

      it "エントリー時刻が表示される" do
        entry = create(:entry, created_at: Time.zone.local(2026, 2, 1, 12, 34, 56))

        get admin_entries_path

        expect(response.body).to include("エントリー時刻")
        expect(response.body).to include(entry.created_at.in_time_zone.strftime("%Y/%m/%d %H:%M:%S"))
      end
    end
  end

  describe "PATCH /admin/entries/:id/cancel" do
    before do
      sign_in_admin
    end

    it "accepted をキャンセルすると waitlisted が繰り上がる" do
      accepted = create(:entry, status: :accepted, priority: 1)
      waiting = create(:entry, status: :waitlisted, priority: 2)

      patch cancel_admin_entry_path(accepted)

      expect(response).to redirect_to(admin_entries_path)
      expect(accepted.reload).to be_cancelled
      expect(waiting.reload).to be_accepted
    end

    it "waitlisted をキャンセルしても繰り上がらない" do
      waiting1 = create(:entry, status: :waitlisted, priority: 2)
      waiting2 = create(:entry, status: :waitlisted, priority: 3)

      patch cancel_admin_entry_path(waiting1)

      expect(response).to redirect_to(admin_entries_path)
      expect(waiting1.reload).to be_cancelled
      expect(waiting2.reload).to be_waitlisted
    end
  end
end

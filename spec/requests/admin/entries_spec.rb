require "rails_helper"

RSpec.describe "Admin::Entries", type: :request do
  def uploaded_csv(content)
    Rack::Test::UploadedFile.new(StringIO.new(content), "text/csv", original_filename: "priorities.csv")
  end

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

    it "キャンセル時に資格情報と参加者セッションを削除する" do
      player = create(:player)
      create(:player_email_credential, player:)
      create(:session, player:)
      entry = create(:entry, player:, status: :pending)

      patch cancel_admin_entry_path(entry)

      expect(response).to redirect_to(admin_entries_path)
      expect(entry.reload).to be_cancelled
      expect(PlayerEmailCredential.where(player:)).to be_empty
      expect(Session.where(player:)).to be_empty
    end
  end

  describe "POST /admin/entries/upload_priorities" do
    before do
      sign_in_admin
    end

    it "優先順位CSVを取り込める" do
      Setting.update!(capacity: 1)
      entry1 = create(:entry, status: :pending, priority: nil)
      entry2 = create(:entry, status: :pending, priority: nil)

      post upload_priorities_admin_entries_path, params: {
        entry_priority_upload: {
          csv_file: uploaded_csv("#{entry1.id},2\n#{entry2.id},1\n"),
        },
      }

      expect(response).to redirect_to(admin_entries_path)
      expect(entry1.reload.priority).to eq(2)
      expect(entry2.reload.priority).to eq(1)
      expect(entry1).to be_waitlisted
      expect(entry2).to be_accepted
    end

    it "CSVファイル未選択は422になる" do
      post upload_priorities_admin_entries_path, params: { entry_priority_upload: {} }

      expect(response).to have_http_status(422)
      expect(response.body).to include("CSVファイルが選択されていません。")
    end

    it "不正CSVのときはDBを更新しない" do
      entry = create(:entry, status: :accepted, priority: 10)

      post upload_priorities_admin_entries_path, params: {
        entry_priority_upload: {
          csv_file: uploaded_csv("#{entry.id},1\n999999,2\n"),
        },
      }

      expect(response).to have_http_status(422)
      expect(response.body).to include("CSVに存在しないIDが含まれています。")
      expect(entry.reload.priority).to eq(10)
      expect(entry).to be_accepted
    end

    context "staff ロール" do
      before do
        sign_in_admin(create(:admin_user, role: :staff))
      end

      it "取り込みできる" do
        Setting.update!(capacity: 1)
        entry = create(:entry, status: :pending, priority: nil)

        post upload_priorities_admin_entries_path, params: {
          entry_priority_upload: {
            csv_file: uploaded_csv("#{entry.id},1\n"),
          },
        }

        expect(response).to redirect_to(admin_entries_path)
        expect(entry.reload.priority).to eq(1)
      end
    end
  end
end

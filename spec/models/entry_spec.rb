require "rails_helper"

RSpec.describe Entry, type: :model do
  describe "enum" do
    it "entry_phase と status が期待値を持つ" do
      expect(described_class.entry_phases).to eq("primary" => 0, "secondary" => 1)
      expect(described_class.statuses).to eq(
        "pending" => 0,
        "accepted" => 1,
        "waitlisted" => 2,
        "cancelled" => 3
      )
    end
  end

  describe "バリデーション" do
    it "priority は 1 以上のみ許可" do
      entry = build(:entry, priority: 0)

      expect(entry).not_to be_valid
      expect(entry.errors[:priority]).to include("は0より大きい値にしてください")
    end

    it "priority は nil を許可" do
      entry = build(:entry, priority: nil)

      expect(entry).to be_valid
    end
  end

  describe "#cancel!" do
    it "accepted のキャンセル時は waitlisted の先頭を繰り上げる" do
      accepted = create(:entry, status: :accepted, priority: 10)
      waiting2 = create(:entry, status: :waitlisted, priority: 12)
      waiting1 = create(:entry, status: :waitlisted, priority: 11)

      accepted.cancel!

      expect(accepted.reload).to be_cancelled
      expect(waiting1.reload).to be_accepted
      expect(waiting2.reload).to be_waitlisted
    end

    it "キャンセル時に資格情報とセッションを削除する" do
      entry = create(:entry, status: :pending)
      create(:player_email_credential, player: entry.player)
      create(:session, player: entry.player)
      create(:session, player: entry.player)

      entry.cancel!

      expect(entry.reload).to be_cancelled
      expect(PlayerEmailCredential.where(player: entry.player)).to be_empty
      expect(Session.where(player: entry.player)).to be_empty
    end

    it "waitlisted のキャンセル時は繰り上げない" do
      waiting = create(:entry, status: :waitlisted, priority: 21)
      another_waiting = create(:entry, status: :waitlisted, priority: 22)

      waiting.cancel!

      expect(waiting.reload).to be_cancelled
      expect(another_waiting.reload).to be_waitlisted
    end

    it "pending のキャンセル時は繰り上げない" do
      pending_entry = create(:entry, status: :pending, priority: nil)
      waiting = create(:entry, status: :waitlisted, priority: 31)

      pending_entry.cancel!

      expect(pending_entry.reload).to be_cancelled
      expect(waiting.reload).to be_waitlisted
    end
  end
end

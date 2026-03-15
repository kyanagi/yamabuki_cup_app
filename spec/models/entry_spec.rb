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

  describe ".public_entry_list" do
    it "priority ありを優先順位順、その後に priority なしを id 順で返す" do
      pending_b = create(:entry, status: :pending, priority: nil)
      accepted_priority3 = create(:entry, status: :accepted, priority: 3)
      accepted_priority1 = create(:entry, status: :accepted, priority: 1)
      pending_a = create(:entry, status: :pending, priority: nil)
      create(:entry, status: :waitlisted, priority: 2)
      create(:entry, status: :cancelled, priority: 99)

      expect(described_class.public_entry_list.pluck(:id)).to eq([
        accepted_priority1.id,
        accepted_priority3.id,
        pending_b.id,
        pending_a.id,
      ])
    end
  end

  describe ".waitlisted_for_entry_list" do
    it "waitlisted のみを priority 順で返す" do
      waitlisted_priority3 = create(:entry, status: :waitlisted, priority: 3)
      create(:entry, status: :accepted, priority: 1)
      waitlisted_priority2 = create(:entry, status: :waitlisted, priority: 2)
      create(:entry, status: :cancelled, priority: 4)

      expect(described_class.waitlisted_for_entry_list.pluck(:id)).to eq([
        waitlisted_priority2.id,
        waitlisted_priority3.id,
      ])
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

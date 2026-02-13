class Entry < ApplicationRecord
  belongs_to :player

  enum :entry_phase, { primary: 0, secondary: 1 }
  enum :status, { pending: 0, accepted: 1, waitlisted: 2, cancelled: 3 }

  validates :entry_phase, presence: true
  validates :status, presence: true
  validates :player_id, uniqueness: true
  validates :priority, numericality: { greater_than: 0 }, allow_nil: true
  validates :priority, uniqueness: true, allow_nil: true

  scope :promotion_candidates, -> { waitlisted.where.not(priority: nil).order(priority: :asc, id: :asc) }
  scope :for_entry_list, -> do
    where.not(status: :cancelled).order(
      Arel.sql("CASE WHEN priority IS NULL THEN 1 ELSE 0 END"),
      :priority,
      :id
    )
  end

  def cancellable?
    !cancelled?
  end

  def entry_phase_label
    I18n.t("entry.entry_phases.#{entry_phase}", default: entry_phase)
  end

  def status_label
    I18n.t("entry.statuses.#{status}", default: status)
  end

  def cancel!
    transaction do
      lock!
      was_accepted = accepted?

      update!(status: :cancelled)

      return if !was_accepted

      self.class.promotion_candidates.lock.first&.update!(status: :accepted)
    end
  end

  def self.create_secondary!(player:, capacity:)
    transaction do
      lock.load

      next_priority = maximum(:priority).to_i + 1
      next_status = accepted.count < capacity ? :accepted : :waitlisted

      create!(
        player:,
        entry_phase: :secondary,
        status: next_status,
        priority: next_priority
      )
    end
  end
end

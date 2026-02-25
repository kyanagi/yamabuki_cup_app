import { Controller } from "@hotwired/stimulus";
import type { ButtonId } from "../lib/buzzer/button_id";
import {
  BUZZER_ASSIGNMENT_CLEAR_EVENT,
  BUZZER_ASSIGNMENT_TOGGLE_LEARNING_EVENT,
  BUZZER_STATE_CHANGED_EVENT,
  BUZZER_VIEW_REQUEST_STATE_EVENT,
} from "../lib/buzzer/events";
import { findButtonIdBySeat } from "../lib/buzzer/mapping_store";
import { createSeatId, isSeatId, type SeatId } from "../lib/buzzer/seat_id";

const UNASSIGNED_TEXT = "未割当";
const LEARNING_TEXT = "ボタンを押してください";

type BuzzerStateChangedDetail = {
  learningSeat: SeatId | null;
  lastPressedButtonId: ButtonId | null;
  mapping: Map<ButtonId, SeatId>;
};

export default class extends Controller {
  connect(): void {
    window.addEventListener(BUZZER_STATE_CHANGED_EVENT, this.#stateChangedHandler as EventListener);
    this.#requestState();
  }

  disconnect(): void {
    window.removeEventListener(BUZZER_STATE_CHANGED_EVENT, this.#stateChangedHandler as EventListener);
  }

  startLearningSeat(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const seatText = button?.getAttribute("data-seat");
    const seat = createSeatId(Number.parseInt(seatText || "", 10));
    if (seat === null) return;

    window.dispatchEvent(
      new CustomEvent<{ seat: SeatId }>(BUZZER_ASSIGNMENT_TOGGLE_LEARNING_EVENT, { detail: { seat } }),
    );
  }

  clearAllMappings(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_ASSIGNMENT_CLEAR_EVENT));
  }

  #requestState(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_VIEW_REQUEST_STATE_EVENT));
  }

  #stateChangedHandler = (event: CustomEvent<BuzzerStateChangedDetail>): void => {
    const detail = event.detail;
    const mapping = detail.mapping instanceof Map ? detail.mapping : new Map<ButtonId, SeatId>();
    const ls = detail.learningSeat;
    const learningSeat = ls !== null && isSeatId(ls) ? ls : null;

    const rows = this.element.querySelectorAll<HTMLElement>("[data-buzzer-assignment-seat-row]");
    for (const row of rows) {
      const seatText = row.getAttribute("data-seat");
      const seat = createSeatId(Number.parseInt(seatText || "", 10));
      if (seat === null) continue;

      const assignment = row.querySelector<HTMLElement>('[data-buzzer-assignment-role="assignment"]');
      const learnButton = row.querySelector<HTMLButtonElement>('[data-buzzer-assignment-role="learnButton"]');
      if (!assignment || !learnButton) continue;

      if (learningSeat === seat) {
        assignment.textContent = LEARNING_TEXT;
        learnButton.textContent = "待受中";
        learnButton.classList.add("is-warning");
        continue;
      }

      const buttonId = findButtonIdBySeat(mapping, seat);
      assignment.textContent = buttonId === null ? UNASSIGNED_TEXT : `ボタン ${buttonId}`;
      learnButton.textContent = "設定";
      learnButton.classList.remove("is-warning");
    }
  };
}

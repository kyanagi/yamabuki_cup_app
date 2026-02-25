import { Controller } from "@hotwired/stimulus";
import { type BuzzerMapping, findButtonIdBySeat } from "../lib/buzzer/mapping_store";

const UNASSIGNED_TEXT = "未割当";
const LEARNING_TEXT = "ボタンを押してください";

type BuzzerStateChangedDetail = {
  learningSeat: number | null;
  lastPressed: string;
  mapping: Record<string, number>;
};

export default class extends Controller {
  connect(): void {
    window.addEventListener("buzzer:state-changed", this.#stateChangedHandler as EventListener);
    this.#requestState();
  }

  disconnect(): void {
    window.removeEventListener("buzzer:state-changed", this.#stateChangedHandler as EventListener);
  }

  startLearningSeat(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const seatText = button?.getAttribute("data-seat");
    const seat = Number.parseInt(seatText || "", 10);
    if (!Number.isInteger(seat)) return;

    window.dispatchEvent(new CustomEvent("buzzer:assignment:toggle-learning", { detail: { seat } }));
  }

  clearAllMappings(): void {
    window.dispatchEvent(new CustomEvent("buzzer:assignment:clear"));
  }

  #requestState(): void {
    window.dispatchEvent(new CustomEvent("buzzer:view:request-state"));
  }

  #stateChangedHandler = (event: CustomEvent<BuzzerStateChangedDetail>): void => {
    const detail = event.detail;
    const mapping = this.#toBuzzerMapping(detail.mapping || {});
    const learningSeat = Number.isInteger(detail.learningSeat) ? detail.learningSeat : null;

    const rows = this.element.querySelectorAll<HTMLElement>("[data-buzzer-assignment-seat-row]");
    for (const row of rows) {
      const seatText = row.getAttribute("data-seat");
      const seat = Number.parseInt(seatText || "", 10);
      if (!Number.isInteger(seat)) continue;

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

  #toBuzzerMapping(mapping: Record<string, number>): BuzzerMapping {
    const parsedMapping: BuzzerMapping = new Map();

    for (const [buttonIdText, mappedSeat] of Object.entries(mapping)) {
      const buttonId = Number.parseInt(buttonIdText, 10);
      if (!Number.isInteger(buttonId)) continue;
      parsedMapping.set(buttonId, mappedSeat);
    }

    return parsedMapping;
  }
}

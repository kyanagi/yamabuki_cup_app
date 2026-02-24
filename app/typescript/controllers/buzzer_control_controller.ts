import { Controller } from "@hotwired/stimulus";
import { type BuzzerChannel, createBuzzerChannel } from "../lib/buzzer/channel";
import {
  assignButtonToSeat,
  type BuzzerMapping,
  clearBuzzerMapping,
  findButtonIdBySeat,
  findSeatByButtonId,
  loadBuzzerMapping,
  saveBuzzerMapping,
} from "../lib/buzzer/mapping_store";

const INITIAL_LAST_PRESSED_TEXT = "未入力";
const UNASSIGNED_TEXT = "未割当";
const LEARNING_TEXT = "ボタンを押してください";

export default class extends Controller {
  static targets = ["connectionStatus", "lastPressed"];

  declare connectionStatusTarget: HTMLElement;
  declare lastPressedTarget: HTMLElement;

  #channel: BuzzerChannel | null = null;
  #mapping: BuzzerMapping = new Map();
  #learningSeat: number | null = null;

  connect(): void {
    this.#mapping = loadBuzzerMapping();
    if (typeof BroadcastChannel !== "undefined") {
      this.#channel = createBuzzerChannel();
    }
    this.#renderSeatRows();
  }

  disconnect(): void {
    this.#channel?.close();
    this.#channel = null;
  }

  pressEmulatorButton(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const buttonId = button?.getAttribute("data-button-id");
    if (!buttonId) return;

    this.lastPressedTarget.textContent = buttonId;

    const numericButtonId = Number.parseInt(buttonId, 10);
    if (Number.isNaN(numericButtonId)) return;

    if (this.#learningSeat !== null) {
      assignButtonToSeat(this.#mapping, numericButtonId, this.#learningSeat);
      saveBuzzerMapping(this.#mapping);
      this.#learningSeat = null;
      this.#renderSeatRows();
      return;
    }

    const seat = findSeatByButtonId(this.#mapping, numericButtonId);
    if (seat === null) return;

    this.#channel?.post({ type: "button_pressed", seat });
  }

  resetFromEmulator(): void {
    this.lastPressedTarget.textContent = INITIAL_LAST_PRESSED_TEXT;
    this.#learningSeat = null;
    this.#renderSeatRows();
    this.#channel?.post({ type: "reset" });
  }

  startLearningSeat(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const seatText = button?.getAttribute("data-seat");
    if (!seatText) return;

    const seat = Number.parseInt(seatText, 10);
    if (Number.isNaN(seat)) return;

    this.#learningSeat = this.#learningSeat === seat ? null : seat;
    this.#renderSeatRows();
  }

  clearAllMappings(): void {
    this.#mapping.clear();
    this.#learningSeat = null;
    clearBuzzerMapping();
    this.#renderSeatRows();
  }

  #renderSeatRows(): void {
    const rows = this.element.querySelectorAll<HTMLElement>("[data-buzzer-control-seat-row]");
    for (const row of rows) {
      const seatText = row.getAttribute("data-seat");
      if (!seatText) continue;

      const seat = Number.parseInt(seatText, 10);
      if (Number.isNaN(seat)) continue;

      const assignment = row.querySelector<HTMLElement>('[data-buzzer-control-role="assignment"]');
      const learnButton = row.querySelector<HTMLButtonElement>('[data-buzzer-control-role="learnButton"]');
      if (!assignment || !learnButton) continue;

      if (this.#learningSeat === seat) {
        assignment.textContent = LEARNING_TEXT;
        learnButton.textContent = "待受中";
        learnButton.classList.add("is-warning");
        continue;
      }

      const buttonId = findButtonIdBySeat(this.#mapping, seat);
      assignment.textContent = buttonId === null ? UNASSIGNED_TEXT : `ボタン ${buttonId}`;
      learnButton.textContent = "設定";
      learnButton.classList.remove("is-warning");
    }
  }
}

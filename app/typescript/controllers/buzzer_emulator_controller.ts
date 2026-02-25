import { Controller } from "@hotwired/stimulus";
import { type ButtonId, createButtonId } from "../lib/buzzer/button_id";
import {
  BUZZER_EMULATOR_BUTTON_PRESS_EVENT,
  BUZZER_EMULATOR_RESET_EVENT,
  BUZZER_STATE_CHANGED_EVENT,
  BUZZER_VIEW_REQUEST_STATE_EVENT,
} from "../lib/buzzer/events";
import type { SeatId } from "../lib/buzzer/seat_id";

const INITIAL_LAST_PRESSED_TEXT = "未入力";

type BuzzerStateChangedDetail = {
  learningSeat: SeatId | null;
  lastPressedButtonId: ButtonId | null;
  mapping: Map<ButtonId, SeatId>;
};

export default class extends Controller {
  static targets = ["lastPressed"];

  declare lastPressedTarget: HTMLElement;

  connect(): void {
    window.addEventListener(BUZZER_STATE_CHANGED_EVENT, this.#stateChangedHandler as EventListener);
    this.#requestState();
  }

  disconnect(): void {
    window.removeEventListener(BUZZER_STATE_CHANGED_EVENT, this.#stateChangedHandler as EventListener);
  }

  pressButton(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const buttonIdText = button?.getAttribute("data-button-id");
    const buttonId = createButtonId(Number.parseInt(buttonIdText || "", 10));
    if (buttonId === null) return;

    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_BUTTON_PRESS_EVENT, { detail: { buttonId } }));
  }

  reset(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_RESET_EVENT));
  }

  #requestState(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_VIEW_REQUEST_STATE_EVENT));
  }

  #stateChangedHandler = (event: CustomEvent<BuzzerStateChangedDetail>): void => {
    const lastPressedButtonId = event.detail?.lastPressedButtonId;
    this.lastPressedTarget.textContent = Number.isInteger(lastPressedButtonId)
      ? String(lastPressedButtonId)
      : INITIAL_LAST_PRESSED_TEXT;
  };
}

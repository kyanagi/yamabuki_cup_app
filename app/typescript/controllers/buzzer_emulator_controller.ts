import { Controller } from "@hotwired/stimulus";
import { type ButtonId, createButtonId } from "../lib/buzzer/button_id";
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
    window.addEventListener("buzzer:state-changed", this.#stateChangedHandler as EventListener);
    this.#requestState();
  }

  disconnect(): void {
    window.removeEventListener("buzzer:state-changed", this.#stateChangedHandler as EventListener);
  }

  pressButton(event: Event): void {
    const button = event.currentTarget as HTMLElement | null;
    const buttonIdText = button?.getAttribute("data-button-id");
    const buttonId = createButtonId(Number.parseInt(buttonIdText || "", 10));
    if (buttonId === null) return;

    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId } }));
  }

  reset(): void {
    window.dispatchEvent(new CustomEvent("buzzer:emulator:reset"));
  }

  #requestState(): void {
    window.dispatchEvent(new CustomEvent("buzzer:view:request-state"));
  }

  #stateChangedHandler = (event: CustomEvent<BuzzerStateChangedDetail>): void => {
    const lastPressedButtonId = event.detail?.lastPressedButtonId;
    this.lastPressedTarget.textContent = Number.isInteger(lastPressedButtonId)
      ? String(lastPressedButtonId)
      : INITIAL_LAST_PRESSED_TEXT;
  };
}

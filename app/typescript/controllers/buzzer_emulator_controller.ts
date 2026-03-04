import { Controller } from "@hotwired/stimulus";
import { createButtonId } from "../lib/buzzer/button_id";
import {
  type BuzzerStateChangedDetail,
  BUZZER_EMULATOR_BUTTON_PRESS_EVENT,
  BUZZER_EMULATOR_CORRECT_EVENT,
  BUZZER_EMULATOR_WRONG_EVENT,
  BUZZER_EMULATOR_RESET_EVENT,
  BUZZER_STATE_CHANGED_EVENT,
  BUZZER_VIEW_REQUEST_STATE_EVENT,
} from "../lib/buzzer/events";

const INITIAL_LAST_PRESSED_TEXT = "未入力";

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
    // BUZZER_STATE_CHANGED_EVENT が同期的に発火して "未入力" を設定するため、その後に上書きする
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_RESET_EVENT));
    this.lastPressedTarget.textContent = "リセット";
  }

  correct(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_CORRECT_EVENT));
    this.lastPressedTarget.textContent = "正解";
  }

  wrong(): void {
    window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_WRONG_EVENT));
    this.lastPressedTarget.textContent = "誤答";
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

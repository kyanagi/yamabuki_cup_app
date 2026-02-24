import { Controller } from "@hotwired/stimulus";

const INITIAL_LAST_PRESSED_TEXT = "未入力";

type BuzzerStateChangedDetail = {
  learningSeat: number | null;
  lastPressed: string;
  mapping: Record<string, number>;
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
    const buttonId = Number.parseInt(buttonIdText || "", 10);
    if (!Number.isInteger(buttonId)) return;

    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId } }));
  }

  reset(): void {
    window.dispatchEvent(new CustomEvent("buzzer:emulator:reset"));
  }

  #requestState(): void {
    window.dispatchEvent(new CustomEvent("buzzer:view:request-state"));
  }

  #stateChangedHandler = (event: CustomEvent<BuzzerStateChangedDetail>): void => {
    const lastPressed = event.detail?.lastPressed;
    this.lastPressedTarget.textContent = typeof lastPressed === "string" ? lastPressed : INITIAL_LAST_PRESSED_TEXT;
  };
}

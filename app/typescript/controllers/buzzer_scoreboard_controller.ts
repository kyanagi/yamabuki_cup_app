import { Controller } from "@hotwired/stimulus";
import { type BuzzerChannel, createBuzzerChannel } from "../lib/buzzer/channel";
import type { BuzzerSignal } from "../lib/buzzer/signal";

const PRESSED_CLASS = "player--buzzer-pressed";

export default class extends Controller {
  #channel: BuzzerChannel | null = null;

  connect(): void {
    if (typeof BroadcastChannel !== "undefined") {
      this.#channel = createBuzzerChannel();
      this.#channel.onMessage((signal) => {
        this.#handleSignal(signal);
      });
    }

    document.addEventListener("turbo:before-stream-render", this.#beforeStreamRenderHandler);
  }

  disconnect(): void {
    document.removeEventListener("turbo:before-stream-render", this.#beforeStreamRenderHandler);
    this.#channel?.close();
    this.#channel = null;
  }

  #handleSignal(signal: BuzzerSignal): void {
    switch (signal.type) {
      case "button_pressed":
        this.#highlightSeat(signal.seat);
        break;
      case "reset":
        this.#clearPressed();
        break;
      default:
        break;
    }
  }

  #highlightSeat(seat: number): void {
    const target = this.element.querySelector<HTMLElement>(`[data-seat="${seat}"]`);
    if (!target) return;

    this.#clearPressed();
    target.classList.add(PRESSED_CLASS);
  }

  #clearPressed(): void {
    this.element.querySelectorAll<HTMLElement>(`[data-seat].${PRESSED_CLASS}`).forEach((element) => {
      element.classList.remove(PRESSED_CLASS);
    });
  }

  #beforeStreamRenderHandler = (event: Event): void => {
    const streamElement = event.target as Element | null;
    if (!streamElement) return;

    const action = streamElement.getAttribute("action");
    const target = streamElement.getAttribute("target");
    if (target !== "match-scorelist") return;
    if (action !== "update" && action !== "replace") return;

    this.#clearPressed();
  };
}

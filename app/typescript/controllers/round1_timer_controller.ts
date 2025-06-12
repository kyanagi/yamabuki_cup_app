import { Controller } from "@hotwired/stimulus";
import "@hotwired/turbo-rails";

// ビューアー側の時計を制御するコントローラ
export default class extends Controller {
  static targets = ["time"];
  declare timeTarget: HTMLElement;

  #timerId: number | undefined;
  #startTime = 0;
  #remainingTimeOnStart = 100000; // ミリ秒

  connect() {
    console.log("Round1TimerController connected");
    document.addEventListener("turbo:before-stream-render", this.#beforeStreamRenderHandler);
    this.updateDisplay();
  }

  disconnect() {
    console.log("Round1TimerController disconnected");
    document.removeEventListener("turbo:before-stream-render", this.#beforeStreamRenderHandler);
    this.stop();
  }

  #beforeStreamRenderHandler = (e: Event) => {
    const customEvent = e as CustomEvent;
    const fallbackToDefaultActions = customEvent.detail.render;
    customEvent.detail.render = (streamElement: HTMLElement) => {
      switch (streamElement.getAttribute("action")) {
        case "timer-start":
          this.start();
          break;
        case "timer-stop":
          this.stop();
          break;
        case "timer-set-remaining-time":
          this.setRemainingTime(Number(streamElement.getAttribute("remaining-time")));
          break;
        default:
          fallbackToDefaultActions(streamElement);
      }
    };
  };

  setRemainingTime(remainingTime: number) {
    this.stop();
    this.#remainingTimeOnStart = remainingTime;
    this.updateDisplay();
  }

  start() {
    if (this.#timerId !== undefined) {
      return;
    }

    this.#startTime = Date.now();
    this.#timerId = window.setInterval(() => {
      this.updateDisplay();
      if (this.remainingTime <= 0) {
        this.stop();
      }
    }, 100);
  }

  stop() {
    if (this.#timerId === undefined) {
      return;
    }

    window.clearInterval(this.#timerId);
    this.#timerId = undefined;

    const elapsed = Date.now() - this.#startTime;
    this.#remainingTimeOnStart = Math.max(0, this.#remainingTimeOnStart - elapsed);
  }

  private updateDisplay() {
    const remaining = this.remainingTime;
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    this.timeTarget.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  private get remainingTime(): number {
    if (!this.isRunning) {
      return this.#remainingTimeOnStart;
    }

    const elapsed = Date.now() - this.#startTime;
    return Math.max(0, this.#remainingTimeOnStart - elapsed);
  }

  private get isRunning(): boolean {
    return this.#timerId !== undefined;
  }
}

import { Controller } from "@hotwired/stimulus";
import { type BuzzerChannel, createBuzzerChannel } from "../lib/buzzer/channel";
import { BUZZER_SERIAL_CORRECT_EVENT, BUZZER_SERIAL_WRONG_EVENT } from "../lib/buzzer/events";
import {
  assignButtonToSeat,
  type BuzzerMapping,
  clearBuzzerMapping,
  findSeatByButtonId,
  loadBuzzerMapping,
  saveBuzzerMapping,
} from "../lib/buzzer/mapping_store";

const INITIAL_LAST_PRESSED_TEXT = "未入力";

type ToggleLearningDetail = {
  seat: number;
};

type ButtonPressDetail = {
  buttonId: number;
};

type BuzzerStateChangedDetail = {
  learningSeat: number | null;
  lastPressed: string;
  mapping: Record<string, number>;
};

export default class extends Controller {
  #channel: BuzzerChannel | null = null;
  #mapping: BuzzerMapping = new Map();
  #learningSeat: number | null = null;
  #lastPressed = INITIAL_LAST_PRESSED_TEXT;

  connect(): void {
    this.#mapping = loadBuzzerMapping();
    if (typeof BroadcastChannel !== "undefined") {
      this.#channel = createBuzzerChannel();
    }

    window.addEventListener("buzzer:assignment:toggle-learning", this.#toggleLearningHandler as EventListener);
    window.addEventListener("buzzer:assignment:clear", this.#clearMappingsHandler);
    window.addEventListener("buzzer:emulator:button-press", this.#buttonPressHandler as EventListener);
    window.addEventListener("buzzer:emulator:reset", this.#resetHandler);
    window.addEventListener(BUZZER_SERIAL_CORRECT_EVENT, this.#serialCorrectHandler);
    window.addEventListener(BUZZER_SERIAL_WRONG_EVENT, this.#serialWrongHandler);
    window.addEventListener("buzzer:view:request-state", this.#requestStateHandler);

    this.#emitStateChanged();
  }

  disconnect(): void {
    window.removeEventListener("buzzer:assignment:toggle-learning", this.#toggleLearningHandler as EventListener);
    window.removeEventListener("buzzer:assignment:clear", this.#clearMappingsHandler);
    window.removeEventListener("buzzer:emulator:button-press", this.#buttonPressHandler as EventListener);
    window.removeEventListener("buzzer:emulator:reset", this.#resetHandler);
    window.removeEventListener(BUZZER_SERIAL_CORRECT_EVENT, this.#serialCorrectHandler);
    window.removeEventListener(BUZZER_SERIAL_WRONG_EVENT, this.#serialWrongHandler);
    window.removeEventListener("buzzer:view:request-state", this.#requestStateHandler);

    this.#channel?.close();
    this.#channel = null;
  }

  #handleButtonPressed(buttonId: number): void {
    this.#lastPressed = String(buttonId);
    if (this.#learningSeat !== null) {
      assignButtonToSeat(this.#mapping, buttonId, this.#learningSeat);
      saveBuzzerMapping(this.#mapping);
      this.#learningSeat = null;
      this.#emitStateChanged();
      return;
    }

    const seat = findSeatByButtonId(this.#mapping, buttonId);
    if (seat !== null) {
      this.#channel?.post({ type: "button_pressed", seat });
    }

    this.#emitStateChanged();
  }

  #emitStateChanged(): void {
    const mapping: Record<string, number> = {};
    for (const [buttonId, seat] of this.#mapping) {
      mapping[String(buttonId)] = seat;
    }

    const detail: BuzzerStateChangedDetail = {
      learningSeat: this.#learningSeat,
      lastPressed: this.#lastPressed,
      mapping,
    };

    window.dispatchEvent(new CustomEvent<BuzzerStateChangedDetail>("buzzer:state-changed", { detail }));
  }

  #toggleLearningHandler = (event: CustomEvent<ToggleLearningDetail>): void => {
    const seat = Number(event.detail?.seat);
    if (!Number.isInteger(seat)) return;

    this.#learningSeat = this.#learningSeat === seat ? null : seat;
    this.#emitStateChanged();
  };

  #clearMappingsHandler = (): void => {
    this.#mapping.clear();
    this.#learningSeat = null;
    clearBuzzerMapping();
    this.#emitStateChanged();
  };

  #buttonPressHandler = (event: CustomEvent<ButtonPressDetail>): void => {
    const buttonId = Number(event.detail?.buttonId);
    if (!Number.isInteger(buttonId)) return;

    this.#handleButtonPressed(buttonId);
  };

  #resetHandler = (): void => {
    this.#lastPressed = INITIAL_LAST_PRESSED_TEXT;
    this.#learningSeat = null;
    this.#channel?.post({ type: "reset" });
    this.#emitStateChanged();
  };

  #requestStateHandler = (): void => {
    this.#emitStateChanged();
  };

  #serialCorrectHandler = (): void => {
    this.#channel?.post({ type: "correct" });
  };

  #serialWrongHandler = (): void => {
    this.#channel?.post({ type: "wrong" });
  };
}

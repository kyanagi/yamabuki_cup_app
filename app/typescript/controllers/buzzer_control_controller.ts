import { Controller } from "@hotwired/stimulus";
import { type ButtonId, isButtonId } from "../lib/buzzer/button_id";
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
import { isSeatId, type SeatId } from "../lib/buzzer/seat_id";

type ToggleLearningDetail = {
  seat: SeatId;
};

type ButtonPressDetail = {
  buttonId: ButtonId;
};

type BuzzerStateChangedDetail = {
  learningSeat: SeatId | null;
  lastPressedButtonId: ButtonId | null;
  mapping: Map<ButtonId, SeatId>;
};

export default class extends Controller {
  #channel: BuzzerChannel | null = null;
  #mapping: BuzzerMapping = new Map();
  #learningSeat: SeatId | null = null;
  #lastPressedButtonId: ButtonId | null = null;

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

  #handleButtonPressed(buttonId: ButtonId): void {
    this.#lastPressedButtonId = buttonId;
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
    const detail: BuzzerStateChangedDetail = {
      learningSeat: this.#learningSeat,
      lastPressedButtonId: this.#lastPressedButtonId,
      mapping: new Map(this.#mapping),
    };

    window.dispatchEvent(new CustomEvent<BuzzerStateChangedDetail>("buzzer:state-changed", { detail }));
  }

  #toggleLearningHandler = (event: CustomEvent<ToggleLearningDetail>): void => {
    const seat = event.detail?.seat;
    // CustomEvent の payload は実行時に壊れ得るため、境界で seat を再検証する。
    if (!isSeatId(seat)) return;

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
    const buttonId = event.detail?.buttonId;
    // CustomEvent の payload は実行時に壊れ得るため、境界で buttonId を再検証する。
    if (!isButtonId(buttonId)) return;

    this.#handleButtonPressed(buttonId);
  };

  #resetHandler = (): void => {
    this.#lastPressedButtonId = null;
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

import type { ButtonId } from "./button_id";
import type { SeatId } from "./seat_id";

export type BuzzerStateChangedDetail = {
  learningSeat: SeatId | null;
  lastPressedButtonId: ButtonId | null;
  mapping: Map<ButtonId, SeatId>;
};

export const BUZZER_ASSIGNMENT_TOGGLE_LEARNING_EVENT = "buzzer:assignment:toggle-learning";
export const BUZZER_ASSIGNMENT_CLEAR_EVENT = "buzzer:assignment:clear";
export const BUZZER_EMULATOR_BUTTON_PRESS_EVENT = "buzzer:emulator:button-press";
export const BUZZER_EMULATOR_CORRECT_EVENT = "buzzer:emulator:correct";
export const BUZZER_EMULATOR_WRONG_EVENT = "buzzer:emulator:wrong";
export const BUZZER_EMULATOR_RESET_EVENT = "buzzer:emulator:reset";
export const BUZZER_SERIAL_CORRECT_EVENT = "buzzer:serial:correct";
export const BUZZER_SERIAL_WRONG_EVENT = "buzzer:serial:wrong";
export const BUZZER_STATE_CHANGED_EVENT = "buzzer:state-changed";
export const BUZZER_VIEW_REQUEST_STATE_EVENT = "buzzer:view:request-state";

import type { SeatId } from "./seat_id";

export type BuzzerSignal =
  | { type: "button_pressed"; seat: SeatId }
  | { type: "correct" }
  | { type: "wrong" }
  | { type: "reset" };

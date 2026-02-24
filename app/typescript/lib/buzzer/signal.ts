export type BuzzerSignal =
  | { type: "button_pressed"; seat: number }
  | { type: "correct" }
  | { type: "wrong" }
  | { type: "reset" };

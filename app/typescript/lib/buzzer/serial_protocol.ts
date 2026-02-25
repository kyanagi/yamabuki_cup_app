import { type ButtonId, createButtonId } from "./button_id";

export type SerialProtocolSignal =
  | { type: "button_pressed"; buttonId: ButtonId }
  | { type: "correct" }
  | { type: "wrong" }
  | { type: "reset" }
  | { type: "log"; message: string; raw: string };

export function parseSerialProtocolLine(line: string): SerialProtocolSignal {
  const raw = line.trim();

  if (/^\d+$/.test(raw)) {
    const value = Number(raw);
    const buttonId = createButtonId(value);
    if (buttonId !== null) {
      return { type: "button_pressed", buttonId };
    }

    if (value === 51) return { type: "correct" };
    if (value === 52) return { type: "wrong" };
    if (value === 99) return { type: "reset" };
    if (value >= 101 && value <= 124) {
      return { type: "log", raw, message: String(value - 101) };
    }
  }

  return {
    type: "log",
    raw,
    message: raw,
  };
}

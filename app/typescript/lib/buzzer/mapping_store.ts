import { type ButtonId, createButtonId, isButtonId, MAX_BUTTON_ID, MIN_BUTTON_ID } from "./button_id";
import { createSeatId, isSeatId, MAX_SEAT, MIN_SEAT, type SeatId } from "./seat_id";

export const BUZZER_MAPPING_STORAGE_KEY = "buzzerMapping";

export { MIN_BUTTON_ID, MAX_BUTTON_ID };
export { MIN_SEAT, MAX_SEAT };

export type BuzzerMapping = Map<ButtonId, SeatId>;

export function assignButtonToSeat(mapping: BuzzerMapping, buttonId: ButtonId, seat: SeatId): void {
  if (!isButtonId(buttonId) || !isSeatId(seat)) return;

  for (const [existingButtonId, existingSeat] of mapping) {
    if (existingSeat === seat && existingButtonId !== buttonId) {
      mapping.delete(existingButtonId);
    }
  }

  mapping.set(buttonId, seat);
}

export function findSeatByButtonId(mapping: BuzzerMapping, buttonId: ButtonId): SeatId | null {
  const seat = mapping.get(buttonId);
  return seat === undefined ? null : seat;
}

export function findButtonIdBySeat(mapping: BuzzerMapping, seat: SeatId): ButtonId | null {
  for (const [buttonId, mappedSeat] of mapping) {
    if (mappedSeat === seat) return buttonId;
  }

  return null;
}

export function loadBuzzerMapping(storage = localStorage): BuzzerMapping {
  const raw = storage.getItem(BUZZER_MAPPING_STORAGE_KEY);
  if (!raw) return new Map();

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mapping: BuzzerMapping = new Map();
    for (const [buttonIdText, seatValue] of Object.entries(parsed)) {
      const buttonId = createButtonId(Number.parseInt(buttonIdText, 10));
      const seat = createSeatId(Number(seatValue));
      if (buttonId === null || seat === null) continue;
      assignButtonToSeat(mapping, buttonId, seat);
    }
    return mapping;
  } catch {
    return new Map();
  }
}

export function saveBuzzerMapping(mapping: BuzzerMapping, storage = localStorage): void {
  const json: Record<string, number> = {};
  for (const [buttonId, seat] of mapping) {
    if (isButtonId(buttonId) && isSeatId(seat)) {
      json[String(buttonId)] = seat;
    }
  }

  if (Object.keys(json).length === 0) {
    storage.removeItem(BUZZER_MAPPING_STORAGE_KEY);
    return;
  }

  storage.setItem(BUZZER_MAPPING_STORAGE_KEY, JSON.stringify(json));
}

export function clearBuzzerMapping(storage = localStorage): void {
  storage.removeItem(BUZZER_MAPPING_STORAGE_KEY);
}

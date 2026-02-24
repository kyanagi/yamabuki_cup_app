export const BUZZER_MAPPING_STORAGE_KEY = "buzzerMapping";
export const MIN_BUTTON_ID = 1;
export const MAX_BUTTON_ID = 24;
export const MIN_SEAT = 0;
export const MAX_SEAT = 11;

export type BuzzerMapping = Map<number, number>;

function isValidButtonId(buttonId: number): boolean {
  return Number.isInteger(buttonId) && buttonId >= MIN_BUTTON_ID && buttonId <= MAX_BUTTON_ID;
}

function isValidSeat(seat: number): boolean {
  return Number.isInteger(seat) && seat >= MIN_SEAT && seat <= MAX_SEAT;
}

export function assignButtonToSeat(mapping: BuzzerMapping, buttonId: number, seat: number): void {
  if (!isValidButtonId(buttonId) || !isValidSeat(seat)) return;

  for (const [existingButtonId, existingSeat] of mapping) {
    if (existingSeat === seat && existingButtonId !== buttonId) {
      mapping.delete(existingButtonId);
    }
  }

  mapping.set(buttonId, seat);
}

export function findSeatByButtonId(mapping: BuzzerMapping, buttonId: number): number | null {
  if (!isValidButtonId(buttonId)) return null;

  const seat = mapping.get(buttonId);
  return seat === undefined ? null : seat;
}

export function findButtonIdBySeat(mapping: BuzzerMapping, seat: number): number | null {
  if (!isValidSeat(seat)) return null;

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
      const buttonId = Number.parseInt(buttonIdText, 10);
      const seat = Number(seatValue);
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
    if (isValidButtonId(buttonId) && isValidSeat(seat)) {
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

export const MIN_SEAT = 0;
export const MAX_SEAT = 11;

declare const seatIdBrand: unique symbol;

export type SeatId = number & { readonly [seatIdBrand]: unknown };

export function isSeatId(value: number): value is SeatId {
  return Number.isInteger(value) && value >= MIN_SEAT && value <= MAX_SEAT;
}

export function createSeatId(rawValue: number): SeatId | null {
  return isSeatId(rawValue) ? (rawValue as SeatId) : null;
}

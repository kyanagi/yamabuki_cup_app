export const MIN_BUTTON_ID = 1;
export const MAX_BUTTON_ID = 24;

declare const buttonIdBrand: unique symbol;

export type ButtonId = number & { readonly [buttonIdBrand]: unknown };

export function isButtonId(value: number): value is ButtonId {
  return Number.isInteger(value) && value >= MIN_BUTTON_ID && value <= MAX_BUTTON_ID;
}

export function createButtonId(rawValue: number): ButtonId | null {
  return isButtonId(rawValue) ? (rawValue as ButtonId) : null;
}

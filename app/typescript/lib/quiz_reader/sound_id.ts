declare const soundIdBrand: unique symbol;

export type SoundId = string & { readonly [soundIdBrand]: unknown };

export function isSoundId(value: string): value is SoundId {
  return value.length >= 1;
}

export function createSoundId(rawValue: string): SoundId | null {
  return isSoundId(rawValue) ? (rawValue as SoundId) : null;
}

declare const questionIdBrand: unique symbol;

const DECIMAL_INTEGER_PATTERN = /^[0-9]+$/;

export type QuestionId = number & { readonly [questionIdBrand]: unknown };
export type QuestionTarget = QuestionId | "next";

export function isQuestionId(value: number): value is QuestionId {
  return Number.isSafeInteger(value) && value >= 1;
}

export function createQuestionId(rawValue: number): QuestionId | null {
  return isQuestionId(rawValue) ? (rawValue as QuestionId) : null;
}

export function parseQuestionIdFromDecimalString(rawValue: string): QuestionId | null {
  if (!DECIMAL_INTEGER_PATTERN.test(rawValue)) {
    return null;
  }
  return createQuestionId(Number(rawValue));
}

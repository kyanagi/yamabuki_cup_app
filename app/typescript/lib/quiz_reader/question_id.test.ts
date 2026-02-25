import { describe, expect, it } from "vitest";
import { createQuestionId, isQuestionId, parseQuestionIdFromDecimalString } from "./question_id";

describe("isQuestionId", () => {
  it("1以上の safe integer を有効とする", () => {
    expect(isQuestionId(1)).toBe(true);
    expect(isQuestionId(42)).toBe(true);
    expect(isQuestionId(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it("1未満の値を無効とする", () => {
    expect(isQuestionId(0)).toBe(false);
    expect(isQuestionId(-1)).toBe(false);
  });

  it("safe integer ではない値を無効とする", () => {
    expect(isQuestionId(1.5)).toBe(false);
    expect(isQuestionId(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isQuestionId(Number.NaN)).toBe(false);
    expect(isQuestionId(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("createQuestionId", () => {
  it("有効値から QuestionId を生成する", () => {
    expect(createQuestionId(42)).toBe(42);
  });

  it("無効値の場合は null を返す", () => {
    expect(createQuestionId(0)).toBeNull();
    expect(createQuestionId(1.5)).toBeNull();
    expect(createQuestionId(Number.MAX_SAFE_INTEGER + 1)).toBeNull();
  });
});

describe("parseQuestionIdFromDecimalString", () => {
  it("10進数字文字列のみを受け付ける", () => {
    expect(parseQuestionIdFromDecimalString("42")).toBe(42);
    expect(parseQuestionIdFromDecimalString("001")).toBe(1);
  });

  it("10進数字文字列以外は拒否する", () => {
    expect(parseQuestionIdFromDecimalString("1e3")).toBeNull();
    expect(parseQuestionIdFromDecimalString("0x2a")).toBeNull();
    expect(parseQuestionIdFromDecimalString("1.5")).toBeNull();
    expect(parseQuestionIdFromDecimalString("abc")).toBeNull();
  });

  it("値は 1以上の safe integer に制限する", () => {
    expect(parseQuestionIdFromDecimalString("0")).toBeNull();
    expect(parseQuestionIdFromDecimalString("9007199254740993")).toBeNull();
  });
});

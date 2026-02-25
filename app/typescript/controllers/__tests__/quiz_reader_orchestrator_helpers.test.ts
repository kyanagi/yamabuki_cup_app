import { describe, expect, it } from "vitest";
import type { LoadingStatus, QuestionReadingContext } from "../quiz_reader/question_reading_context";
import {
  formatDurationText,
  parseSwitchToQuestionInput,
  parseUpdateQuestionStreamAttributes,
} from "../quiz_reader/quiz_reader_orchestrator";

function createReadingContext(params: { readDuration: number; fullDuration: number }): QuestionReadingContext {
  return {
    load: async () => {},
    start: async () => {},
    stop: () => {},
    reset: () => {},
    dispose: () => {},
    get questionId() {
      return 1;
    },
    get fullDuration() {
      return params.fullDuration;
    },
    get readDuration() {
      return params.readDuration;
    },
    get voiceStatus() {
      return "STANDBY";
    },
    set loadingStatus(_status: LoadingStatus) {},
  };
}

describe("parseUpdateQuestionStreamAttributes", () => {
  it("update-question 以外は null を返す", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update");

    // Act
    const parsedAttributes = parseUpdateQuestionStreamAttributes(streamElement);

    // Assert
    expect(parsedAttributes).toBeNull();
  });

  it("question-id が欠落している場合は例外を投げる", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update-question");
    streamElement.setAttribute("sound-id", "001");

    // Assert
    expect(() => parseUpdateQuestionStreamAttributes(streamElement)).toThrow("question-id が指定されていません。");
  });

  it("sound-id が欠落している場合は例外を投げる", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update-question");
    streamElement.setAttribute("question-id", "10");

    // Assert
    expect(() => parseUpdateQuestionStreamAttributes(streamElement)).toThrow("sound-id が指定されていません。");
  });

  it("question-id が非数値でも throw せず NaN を返す", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update-question");
    streamElement.setAttribute("question-id", "abc");
    streamElement.setAttribute("sound-id", "001");

    // Act
    const parsedAttributes = parseUpdateQuestionStreamAttributes(streamElement);

    // Assert
    expect(parsedAttributes).not.toBeNull();
    expect(Number.isNaN(parsedAttributes?.questionId)).toBe(true);
    expect(parsedAttributes?.soundId).toBe("001");
  });
});

describe("parseSwitchToQuestionInput", () => {
  it("null は cancelled として扱う", () => {
    // Act
    const parsedInput = parseSwitchToQuestionInput(null);

    // Assert
    expect(parsedInput).toEqual({ kind: "cancelled" });
  });

  it("空白のみは invalid として扱う", () => {
    // Act
    const parsedInput = parseSwitchToQuestionInput("   ");

    // Assert
    expect(parsedInput).toEqual({ kind: "invalid" });
  });

  it("非数字は invalid として扱う", () => {
    // Act
    const parsedInput = parseSwitchToQuestionInput("abc");

    // Assert
    expect(parsedInput).toEqual({ kind: "invalid" });
  });

  it("前後空白のある数字は trim して valid として扱う", () => {
    // Act
    const parsedInput = parseSwitchToQuestionInput(" 42 ");

    // Assert
    expect(parsedInput).toEqual({
      kind: "valid",
      questionId: "42",
    });
  });
});

describe("formatDurationText", () => {
  it("小数第2位で丸めた表示文字列を返す", () => {
    // Arrange
    const readingContext = createReadingContext({
      readDuration: 2.2,
      fullDuration: 4.4,
    });

    // Act
    const text = formatDurationText(readingContext);

    // Assert
    expect(text).toBe("2.20 / 4.40");
  });
});

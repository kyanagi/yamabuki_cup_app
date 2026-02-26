import { describe, expect, it } from "vitest";
import { testQuestionId } from "../../__tests__/helpers/question-id";
import { testSoundId } from "../../__tests__/helpers/sound-id";
import type { LoadingStatus, QuestionReadingContext, VoiceStatus } from "../quiz_reader/question_reading_context";
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
      return testQuestionId(1);
    },
    get fullDuration() {
      return params.fullDuration;
    },
    get readDuration() {
      return params.readDuration;
    },
    get voiceStatus(): VoiceStatus {
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

  it("sound-id が空文字の場合は例外を投げる", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update-question");
    streamElement.setAttribute("question-id", "10");
    streamElement.setAttribute("sound-id", "");

    // Assert
    expect(() => parseUpdateQuestionStreamAttributes(streamElement)).toThrow(
      "sound-id は空文字以外で指定してください。",
    );
  });

  it.each(["abc", "0", "-1", "1.5", "1e3", "0x2a", "9007199254740993"])(
    "question-id=%s は例外を投げる",
    (questionId) => {
      // Arrange
      const streamElement = document.createElement("turbo-stream");
      streamElement.setAttribute("action", "update-question");
      streamElement.setAttribute("question-id", questionId);
      streamElement.setAttribute("sound-id", "001");

      // Assert
      expect(() => parseUpdateQuestionStreamAttributes(streamElement)).toThrow();
    },
  );

  it("question-id が有効値の場合は QuestionId を返す", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update-question");
    streamElement.setAttribute("question-id", "10");
    streamElement.setAttribute("sound-id", "001");

    // Act
    const parsedAttributes = parseUpdateQuestionStreamAttributes(streamElement);

    // Assert
    expect(parsedAttributes).toEqual({
      questionId: testQuestionId(10),
      soundId: testSoundId("001"),
    });
  });

  it("sound-id が非空文字であれば任意文字列を許可する", () => {
    // Arrange
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update-question");
    streamElement.setAttribute("question-id", "10");
    streamElement.setAttribute("sound-id", "abc");

    // Act
    const parsedAttributes = parseUpdateQuestionStreamAttributes(streamElement);

    // Assert
    expect(parsedAttributes).toEqual({
      questionId: testQuestionId(10),
      soundId: testSoundId("abc"),
    });
  });
});

describe("parseSwitchToQuestionInput", () => {
  it("null は cancelled として扱う", () => {
    // Act
    const parsedInput = parseSwitchToQuestionInput(null);

    // Assert
    expect(parsedInput).toEqual({ kind: "cancelled" });
  });

  it.each(["   ", "abc", "0", "-1", "1.5", "1e3", "0x2a", "9007199254740993"])(
    "%s は invalid として扱う",
    (rawValue) => {
      // Act
      const parsedInput = parseSwitchToQuestionInput(rawValue);

      // Assert
      expect(parsedInput).toEqual({ kind: "invalid" });
    },
  );

  it("前後空白のある数字は trim して valid として扱う", () => {
    // Act
    const parsedInput = parseSwitchToQuestionInput(" 42 ");

    // Assert
    expect(parsedInput).toEqual({
      kind: "valid",
      questionId: testQuestionId(42),
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

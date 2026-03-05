import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { MockAudioContext } from "../../__tests__/mocks/audio-context";
import QuizReaderController from "../quiz_reader_controller";

// vi.hoisted() でモック関数を事前に定義（vi.mockのホイスティングに対応）
const { mockIdbAdd, mockIdbGetAll, mockOpenDB, mockRenderStreamMessage } = vi.hoisted(() => {
  const add = vi.fn().mockResolvedValue(1);
  const getAll = vi.fn().mockResolvedValue([]);
  const openDB = vi.fn().mockResolvedValue({ add, getAll });
  const renderStreamMessage = vi.fn();
  return {
    mockIdbAdd: add,
    mockIdbGetAll: getAll,
    mockOpenDB: openDB,
    mockRenderStreamMessage: renderStreamMessage,
  };
});

// idb モジュールをトップレベルでモック
vi.mock("idb", () => ({
  openDB: mockOpenDB,
}));

// Turbo モジュールをトップレベルでモック
vi.mock("@hotwired/turbo-rails", () => ({
  Turbo: {
    renderStreamMessage: mockRenderStreamMessage,
  },
}));

describe("QuizReaderController: フォーカス状態ハイライト", () => {
  beforeEach(() => {
    // idbモックを再設定（vi.resetAllMocksでリセットされるため）
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    vi.stubGlobal(
      "AudioContext",
      vi.fn(function AudioContextStub() {
        return new MockAudioContext();
      }),
    );
  });

  describe("connect() 初期化", () => {
    it("document.hasFocus() が true のとき keyLegend に has-background-info が付く", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(true);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });

    it("document.hasFocus() が false のとき keyLegend に has-background-info が付かない", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });

    it("初期DOMに has-background-info があっても document.hasFocus() が false なら除去される（Turboキャッシュ復帰対策）", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", keyLegendFocused: true });

      // Act
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("onWindowFocus() / onWindowBlur() 直接呼び出し", () => {
    it("onWindowFocus() を呼ぶと keyLegend に has-background-info が付く", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      (controller as { onWindowFocus: () => void }).onWindowFocus();

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });

    it("onWindowBlur() を呼ぶと keyLegend から has-background-info が除去される", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(true);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      (controller as { onWindowBlur: () => void }).onWindowBlur();

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("window イベント dispatch による配線確認", () => {
    it("focus イベントで keyLegend に has-background-info が付く", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", includeWindowFocusActions: true });
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      window.dispatchEvent(new Event("focus"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });

    it("blur イベントで keyLegend から has-background-info が除去される", async () => {
      // Arrange
      vi.spyOn(document, "hasFocus").mockReturnValue(true);
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001", includeWindowFocusActions: true });
      const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      window.dispatchEvent(new Event("blur"));
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Assert
      const keyLegend = document.querySelector('[data-quiz-reader-target~="keyLegend"]');
      expect(keyLegend?.classList.contains("has-background-info")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });
});

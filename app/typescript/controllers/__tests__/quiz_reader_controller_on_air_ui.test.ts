import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import QuizReaderController from "../quiz_reader_controller";

// vi.hoisted() でモック関数を事前に定義（vi.mockのホイスティングに対応）
const { mockIdbAdd, mockIdbGetAll, mockRenderStreamMessage, mockOpenDB } = vi.hoisted(() => {
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

describe("applyOnAirStateToUI", () => {
  beforeEach(() => {
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);
  });

  it("問い読みON時、問題内容が表示されカードにグレーアウトクラスがない", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert
    const nextQuestionContent = document.querySelector('[data-quiz-reader-target~="nextQuestionContent"]');
    const next2QuestionContent = document.querySelector('[data-quiz-reader-target~="next2QuestionContent"]');
    const nextQuestionBox = document.querySelector('[data-quiz-reader-target~="nextQuestionBox"]');
    const next2QuestionBox = document.querySelector('[data-quiz-reader-target~="next2QuestionBox"]');
    const onAirLabel = document.querySelector('[data-quiz-reader-target~="onAirLabel"]');

    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(false);
    expect(next2QuestionContent?.classList.contains("is-hidden")).toBe(false);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(false);
    expect(next2QuestionBox?.classList.contains("quiz-reader-off-air")).toBe(false);
    expect(onAirLabel?.textContent).toBe("問い読みON");

    // Cleanup
    teardownControllerTest(application);
  });

  it("問い読みOFF時、問題内容が非表示になりカードがグレーアウトする", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: false });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert
    const nextQuestionContent = document.querySelector('[data-quiz-reader-target~="nextQuestionContent"]');
    const next2QuestionContent = document.querySelector('[data-quiz-reader-target~="next2QuestionContent"]');
    const nextQuestionBox = document.querySelector('[data-quiz-reader-target~="nextQuestionBox"]');
    const next2QuestionBox = document.querySelector('[data-quiz-reader-target~="next2QuestionBox"]');
    const onAirLabel = document.querySelector('[data-quiz-reader-target~="onAirLabel"]');

    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(true);
    expect(next2QuestionContent?.classList.contains("is-hidden")).toBe(true);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(true);
    expect(next2QuestionBox?.classList.contains("quiz-reader-off-air")).toBe(true);
    expect(onAirLabel?.textContent).toBe("問い読みOFF");

    // Cleanup
    teardownControllerTest(application);
  });

  it("問い読みスイッチを切り替えると状態が反映される", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 1, soundId: "001", isOnAir: true });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");
    const isOnAirCheckbox = document.querySelector('[data-quiz-reader-target~="isOnAir"]') as HTMLInputElement;

    // Act: ON -> OFF
    isOnAirCheckbox.checked = false;
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert: OFF状態
    const nextQuestionContent = document.querySelector('[data-quiz-reader-target~="nextQuestionContent"]');
    const nextQuestionBox = document.querySelector('[data-quiz-reader-target~="nextQuestionBox"]');
    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(true);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(true);

    // Act: OFF -> ON
    isOnAirCheckbox.checked = true;
    (controller as { applyOnAirStateToUI: () => void }).applyOnAirStateToUI();

    // Assert: ON状態
    expect(nextQuestionContent?.classList.contains("is-hidden")).toBe(false);
    expect(nextQuestionBox?.classList.contains("quiz-reader-off-air")).toBe(false);

    // Cleanup
    teardownControllerTest(application);
  });
});

// 注意: 外部連携テスト（Turbo Stream, IndexedDB, アップロード）は
// ローカルファイル読み込みへの変更に伴い、フォルダ選択のモックが必要になりました。
// これらのテストは selectFolder のモックを追加した後に再実装する必要があります。

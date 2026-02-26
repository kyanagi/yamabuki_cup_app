import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import type { LoadingStatus, VoiceStatus } from "../quiz_reader/question_reading_context";
import QuizReaderController from "../quiz_reader_controller";

type FetchCallArgs = [
  string,
  {
    method: string;
    headers: { "Content-Type"?: string; "X-CSRF-Token"?: string; Accept?: string };
    body: string;
  },
];

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

describe("proceedToNextQuestion", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    // fetchをモック
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("<turbo-stream></turbo-stream>"),
      json: vi.fn().mockResolvedValue({ success: true, question_id: 1 }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // CSRFトークンのメタタグを追加
    const meta = document.createElement("meta");
    meta.setAttribute("name", "csrf-token");
    meta.setAttribute("content", "test-csrf-token");
    document.head.appendChild(meta);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // メタタグを削除
    const meta = document.querySelector('meta[name="csrf-token"]');
    meta?.remove();
  });

  it("PAUSED状態で呼ばれると2つのリクエストを送信する（問題送出→次の問題）", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // readingContextをモックして PAUSED 状態にする
    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
      fullDuration: 5.0,
      readDuration: 3.0,
      load: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      loadingStatus: "LOADED" as LoadingStatus,
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
    (controller as any).readingContext = mockReadingContext;

    // Act
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // fetchが完了するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 2つのリクエストが送信された
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 1番目: 問題送出リクエスト
    const firstCall = fetchSpy.mock.calls[0] as FetchCallArgs;
    expect(firstCall[0]).toBe("/admin/question_broadcasts");
    expect(firstCall[1].method).toBe("POST");
    expect(firstCall[1].headers["Content-Type"]).toBe("application/json");
    expect(firstCall[1].headers.Accept).toBe("application/json");
    expect(JSON.parse(firstCall[1].body)).toEqual({ question_id: 42 });

    // 2番目: 次の問題に進むリクエスト
    const secondCall = fetchSpy.mock.calls[1] as FetchCallArgs;
    expect(secondCall[0]).toBe("/admin/quiz_reader/next_question");
    expect(secondCall[1].method).toBe("PUT");

    // Cleanup
    teardownControllerTest(application);
  });

  it("PAUSED以外の状態では何も送信しない", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // readingContextをモックして STANDBY 状態にする
    const mockReadingContext = {
      voiceStatus: "STANDBY" as VoiceStatus,
      questionId: 42,
      fullDuration: 5.0,
      readDuration: 0,
      load: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      loadingStatus: "LOADED" as LoadingStatus,
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
    (controller as any).readingContext = mockReadingContext;

    // Act
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // Assert: リクエストは送信されない
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    teardownControllerTest(application);
  });

  it("問題送出が失敗しても次の問題への遷移は続行する", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // 1回目（問題送出）は失敗、2回目（次の問題）は成功
    fetchSpy.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue("<turbo-stream></turbo-stream>"),
    });

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
      fullDuration: 5.0,
      readDuration: 3.0,
      load: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      loadingStatus: "LOADED" as LoadingStatus,
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
    (controller as any).readingContext = mockReadingContext;

    // console.errorをモックして出力を抑制
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // fetchが完了するのを待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 両方のリクエストが試行された
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // エラーがログに出力された
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Turbo.renderStreamMessageが呼ばれた（次の問題への遷移が成功）
    expect(mockRenderStreamMessage).toHaveBeenCalled();

    // Cleanup
    consoleErrorSpy.mockRestore();
    teardownControllerTest(application);
  });

  it("キーリピート時は何も送信しない", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001" });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
      fullDuration: 5.0,
      readDuration: 3.0,
      load: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      loadingStatus: "LOADED" as LoadingStatus,
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
    (controller as any).readingContext = mockReadingContext;

    // Act: repeat=trueのイベント
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: true });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    // Assert: リクエストは送信されない
    expect(fetchSpy).not.toHaveBeenCalled();

    // Cleanup
    teardownControllerTest(application);
  });

  it("問題フォローがONの場合、問題送出と次の問題への遷移が両方実行される", async () => {
    // Arrange
    const html = createQuizReaderHTML({ questionId: 42, soundId: "001", isQuestionFollowOn: true });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
      fullDuration: 5.0,
      readDuration: 3.0,
      load: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      loadingStatus: "LOADED" as LoadingStatus,
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
    (controller as any).readingContext = mockReadingContext;

    // Act
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 2つのリクエストが送信された（問題送出 + 次の問題）
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("/admin/question_broadcasts");
    expect(fetchSpy.mock.calls[1]?.[0]).toBe("/admin/quiz_reader/next_question");

    // Cleanup
    teardownControllerTest(application);
  });

  it("問題フォローがOFFの場合、問題送出はせず次の問題への遷移のみ実行される", async () => {
    // Arrange
    const html = createQuizReaderHTML({
      questionId: 42,
      soundId: "001",
      isQuestionFollowOn: false,
    });
    const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    const mockReadingContext = {
      voiceStatus: "PAUSED" as VoiceStatus,
      questionId: 42,
      fullDuration: 5.0,
      readDuration: 3.0,
      load: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
      loadingStatus: "LOADED" as LoadingStatus,
    };
    // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
    (controller as any).readingContext = mockReadingContext;

    // Act
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", repeat: false });
    await (controller as { proceedToNextQuestion: (event: KeyboardEvent) => Promise<void> }).proceedToNextQuestion(
      event,
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert: 次の問題への遷移リクエストのみ送信された（問題送出は行われない）
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("/admin/quiz_reader/next_question");

    // Cleanup
    teardownControllerTest(application);
  });
});

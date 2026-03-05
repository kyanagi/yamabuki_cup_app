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

vi.mock("idb", () => ({
  openDB: mockOpenDB,
}));

vi.mock("@hotwired/turbo-rails", () => ({
  Turbo: {
    renderStreamMessage: mockRenderStreamMessage,
  },
}));

// BroadcastChannel のモック（正規関数で定義。アロー関数は new できないため不可）
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly postMessage = vi.fn();
  readonly close = vi.fn();

  constructor(_name: string) {
    MockBroadcastChannel.instances.push(this);
  }
}

function latestChannel(): MockBroadcastChannel {
  const channel = MockBroadcastChannel.instances.at(-1);
  if (!channel) throw new Error("BroadcastChannel instance not found");
  return channel;
}

describe("QuizReaderController: commit シグナル送信", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);

    vi.stubGlobal(
      "AudioContext",
      vi.fn(function AudioContextStub() {
        return new MockAudioContext();
      }),
    );

    vi.spyOn(document, "hasFocus").mockReturnValue(false);
  });

  it("C キーを押すと BuzzerChannel に commit シグナルが postMessage される", async () => {
    // Arrange
    const html = createQuizReaderHTML({
      questionId: 1,
      soundId: "001",
      includeCommitBuzzerAction: true,
    });
    const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(latestChannel().postMessage).toHaveBeenCalledWith({ type: "commit" });

    teardownControllerTest(application);
  });

  it("event.repeat=true のとき commit シグナルは送信されない", async () => {
    // Arrange
    const html = createQuizReaderHTML({
      questionId: 1,
      soundId: "001",
      includeCommitBuzzerAction: true,
    });
    const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act: repeat=true のキーイベント
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true, repeat: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(latestChannel().postMessage).not.toHaveBeenCalled();

    teardownControllerTest(application);
  });

  it("モーダルが開いているとき commit シグナルは送信されない", async () => {
    // Arrange: settingsModal を is-active にした HTML
    const html = createQuizReaderHTML({
      questionId: 1,
      soundId: "001",
      includeCommitBuzzerAction: true,
      settingsModalActive: true,
    });
    const { application } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

    // Act
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert
    expect(latestChannel().postMessage).not.toHaveBeenCalled();

    teardownControllerTest(application);
  });
});

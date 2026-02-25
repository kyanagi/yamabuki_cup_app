import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuizReaderHTML } from "../../__tests__/helpers/dom-factory";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { createMockAudioBuffer, MockAudioContext } from "../../__tests__/mocks/audio-context";
import QuizReaderController from "../quiz_reader_controller";
import { createMockDirectoryHandle } from "./quiz_reader_controller_test_helpers";

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

describe("サンプル音声機能", () => {
  beforeEach(() => {
    // idbモックを再設定
    mockOpenDB.mockResolvedValue({ add: mockIdbAdd, getAll: mockIdbGetAll });
    mockIdbAdd.mockResolvedValue(1);
    mockIdbGetAll.mockResolvedValue([]);
  });

  describe("openSettingsModal", () => {
    it("モーダルにis-activeクラスを追加する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act
      (controller as { openSettingsModal: () => void }).openSettingsModal();

      // Assert
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      expect(modal?.classList.contains("is-active")).toBe(true);

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("closeSettingsModal", () => {
    it("モーダルからis-activeクラスを削除する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モーダルを開いておく
      const modal = document.querySelector('[data-quiz-reader-target~="settingsModal"]');
      modal?.classList.add("is-active");

      // Act
      (controller as { closeSettingsModal: () => void }).closeSettingsModal();

      // Assert
      expect(modal?.classList.contains("is-active")).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });

    it("stopSampleAudioを呼び出す", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const stopSpy = vi.spyOn(controller as { stopSampleAudio: () => void }, "stopSampleAudio");

      // Act
      (controller as { closeSettingsModal: () => void }).closeSettingsModal();

      // Assert
      expect(stopSpy).toHaveBeenCalled();

      // Cleanup
      stopSpy.mockRestore();
      teardownControllerTest(application);
    });
  });

  describe("playSampleAudio", () => {
    beforeEach(() => {
      // AudioContextをモック
      vi.stubGlobal("AudioContext", MockAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("音声フォルダ未選択時にalertを表示する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      // Act
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert
      expect(alertSpy).toHaveBeenCalledWith("サンプル音声を再生するには、音声フォルダを選択してください");

      // Cleanup
      alertSpy.mockRestore();
      teardownControllerTest(application);
    });

    it("音声フォルダからsample.wavを読み込んで再生する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = createMockDirectoryHandle({
        "sample.wav": mockArrayBuffer,
      });

      // soundDirHandle を設定
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert: sampleAudioSourceが作成されている（再生された）
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioBuffer).toBeDefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("2回目以降はキャッシュを使用する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      let getFileHandleCallCount = 0;
      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          getFileHandleCallCount++;
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            async getFile() {
              return {
                name: fileName,
                type: "audio/wav",
                size: mockArrayBuffer.byteLength,
                async arrayBuffer() {
                  return mockArrayBuffer;
                },
              } as unknown as File;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 2回再生
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert: getFileHandleは1回だけ
      expect(getFileHandleCallCount).toBe(1);

      // Cleanup
      teardownControllerTest(application);
    });

    it("読み込み中に再度呼ばれた場合は多重再生を防ぐ", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      let getFileHandleCallCount = 0;
      let resolveGetFile: (value: unknown) => void;
      const delayedGetFile = new Promise((resolve) => {
        resolveGetFile = resolve;
      });

      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          getFileHandleCallCount++;
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            getFile() {
              return delayedGetFile;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 1回目の再生を開始（まだ完了しない）
      const firstPlay = (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // 2回目の再生を試みる（読み込み中なのでスキップされるはず）
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert: getFileHandleは1回だけ呼ばれている
      expect(getFileHandleCallCount).toBe(1);

      // 1回目を完了させる
      // biome-ignore lint/style/noNonNullAssertion: テスト用にPromise内で必ず初期化される
      resolveGetFile!({
        name: "sample.wav",
        type: "audio/wav",
        size: mockArrayBuffer.byteLength,
        async arrayBuffer() {
          return mockArrayBuffer;
        },
      });
      await firstPlay;

      // Cleanup
      teardownControllerTest(application);
    });

    it("読み込み中にstopSampleAudioが呼ばれると再生がキャンセルされる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const mockArrayBuffer = new ArrayBuffer(100);
      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            async getFile() {
              // getFile中にabortされたらAbortErrorを投げる
              return {
                name: fileName,
                type: "audio/wav",
                size: mockArrayBuffer.byteLength,
                async arrayBuffer() {
                  // 少し遅延させてabortを検知できるようにする
                  await new Promise((resolve) => setTimeout(resolve, 10));
                  return mockArrayBuffer;
                },
              } as unknown as File;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 再生を開始
      const playPromise = (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // 読み込み中に停止
      (controller as { stopSampleAudio: () => void }).stopSampleAudio();

      // 再生が完了するのを待つ
      await playPromise;

      // Assert: sampleAudioSourceは作成されない（再生されない）
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioSource).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("sample.wavが存在しない場合にエラーメッセージを表示する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // sample.wavが存在しないモックディレクトリ
      const mockDirHandle = createMockDirectoryHandle({});

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      // Act
      await (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // Assert
      expect(alertSpy).toHaveBeenCalledWith("sample.wav が見つかりません");

      // Cleanup
      alertSpy.mockRestore();
      teardownControllerTest(application);
    });

    it("読み込み中にキャンセルされ、その後読み込みが完了しても古いバッファがセットされない", async () => {
      // Arrange
      // このテストは、フォルダ変更時のシナリオを再現:
      // 1. playSampleAudio() を呼び出す（フォルダA）
      // 2. loadAudioFromLocalFile() が進行中に stopSampleAudio() を呼び出す
      // 3. その後、loadAudioFromLocalFile() が完了する
      // 4. バグがある場合: 古いバッファがセットされてしまう
      // 5. 修正後: signal.aborted をチェックしてバッファをセットしない
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const mockArrayBuffer = new ArrayBuffer(100);
      let resolveArrayBuffer: (value: ArrayBuffer) => void;
      const delayedArrayBuffer = new Promise<ArrayBuffer>((resolve) => {
        resolveArrayBuffer = resolve;
      });

      const mockDirHandle = {
        name: "test-folder",
        kind: "directory",
        async getFileHandle(fileName: string) {
          if (fileName !== "sample.wav") {
            throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
          }
          return {
            kind: "file",
            name: fileName,
            async getFile() {
              return {
                name: fileName,
                type: "audio/wav",
                size: mockArrayBuffer.byteLength,
                arrayBuffer() {
                  // arrayBuffer() を遅延させることで、読み込み中にキャンセルを可能にする
                  return delayedArrayBuffer;
                },
              } as unknown as File;
            },
          } as FileSystemFileHandle;
        },
      } as FileSystemDirectoryHandle;

      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).soundDirHandle = mockDirHandle;

      // Act: 再生を開始（loadAudioFromLocalFile が進行中の状態）
      const playPromise = (controller as { playSampleAudio: () => Promise<void> }).playSampleAudio();

      // arrayBuffer() が呼ばれるまで少し待つ
      await new Promise((resolve) => setTimeout(resolve, 5));

      // 読み込み中に停止（フォルダ変更などのシナリオ）
      (controller as { stopSampleAudio: () => void }).stopSampleAudio();

      // その後、arrayBuffer() を完了させる（実際のファイルシステムでは非同期に完了する）
      // biome-ignore lint/style/noNonNullAssertion: テスト用にPromise内で必ず初期化される
      resolveArrayBuffer!(mockArrayBuffer);

      // 再生処理が完了するのを待つ
      await playPromise;

      // Assert: キャンセル後なのでバッファがセットされていないはず
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioBuffer).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("stopSampleAudio", () => {
    beforeEach(() => {
      vi.stubGlobal("AudioContext", MockAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("再生中の音声を停止する", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // モックのAudioBufferSourceNodeを設定
      const mockSource = {
        onended: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
      };
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).sampleAudioSource = mockSource;

      // Act
      (controller as { stopSampleAudio: () => void }).stopSampleAudio();

      // Assert
      expect(mockSource.onended).toBeNull();
      expect(mockSource.stop).toHaveBeenCalled();
      expect(mockSource.disconnect).toHaveBeenCalled();
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioSource).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("sampleAudioSourceがundefinedの場合は何もしない", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // Act & Assert: エラーが発生しないことを確認
      expect(() => {
        (controller as { stopSampleAudio: () => void }).stopSampleAudio();
      }).not.toThrow();

      // Cleanup
      teardownControllerTest(application);
    });
  });

  describe("selectFolder", () => {
    beforeEach(() => {
      vi.stubGlobal("AudioContext", MockAudioContext);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("フォルダ変更時にsampleAudioBufferがクリアされる", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // 既存のsampleAudioBufferを設定
      const mockBuffer = createMockAudioBuffer(1.0);
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      (controller as any).sampleAudioBuffer = mockBuffer;

      // showDirectoryPickerをモック
      const mockDirHandle = createMockDirectoryHandle({});
      vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(mockDirHandle));

      // Act
      await (controller as { selectFolder: () => Promise<void> }).selectFolder();

      // Assert: sampleAudioBufferがクリアされている
      // biome-ignore lint/suspicious/noExplicitAny: テスト用にprivateプロパティにアクセス
      expect((controller as any).sampleAudioBuffer).toBeUndefined();

      // Cleanup
      teardownControllerTest(application);
    });

    it("フォルダ変更時に再生中のサンプル音声が停止される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      // stopSampleAudioをスパイ
      const stopSpy = vi.spyOn(controller as { stopSampleAudio: () => void }, "stopSampleAudio");

      // showDirectoryPickerをモック
      const mockDirHandle = createMockDirectoryHandle({});
      vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(mockDirHandle));

      // Act
      await (controller as { selectFolder: () => Promise<void> }).selectFolder();

      // Assert: stopSampleAudioが呼ばれている
      expect(stopSpy).toHaveBeenCalled();

      // Cleanup
      stopSpy.mockRestore();
      teardownControllerTest(application);
    });

    it("フォルダ選択後にサンプル音声ボタンが有効化される", async () => {
      // Arrange
      const html = createQuizReaderHTML({ questionId: 1, soundId: "001" });
      const { application, controller } = await setupControllerTest(QuizReaderController, html, "quiz-reader");

      const playButton = document.querySelector('[data-quiz-reader-target~="samplePlayButton"]') as HTMLButtonElement;
      const stopButton = document.querySelector('[data-quiz-reader-target~="sampleStopButton"]') as HTMLButtonElement;

      // 初期状態ではdisabled
      expect(playButton.disabled).toBe(true);
      expect(stopButton.disabled).toBe(true);

      // showDirectoryPickerをモック
      const mockDirHandle = createMockDirectoryHandle({});
      vi.stubGlobal("showDirectoryPicker", vi.fn().mockResolvedValue(mockDirHandle));

      // Act: selectFolderメソッドを直接呼び出す
      await (controller as { selectFolder: () => Promise<void> }).selectFolder();

      // Assert: ボタンが有効化されている
      expect(playButton.disabled).toBe(false);
      expect(stopButton.disabled).toBe(false);

      // Cleanup
      teardownControllerTest(application);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockAudioContext, createMockAudioBuffer } from "../../__tests__/mocks/audio-context";
import { loadAudio } from "../quiz_reader_controller";

describe("loadAudio", () => {
  const CACHE_NAME = "yamabuki-cup-quiz-reader";
  let mockAudioContext: MockAudioContext;
  let abortController: AbortController;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    abortController = new AbortController();
  });

  describe("U1: キャッシュヒット時", () => {
    it("fetchを呼ばずにキャッシュからデータを返す", async () => {
      // Arrange: キャッシュにデータを設定
      const testUrl = "/sample/test.wav";
      const cachedArrayBuffer = new ArrayBuffer(100);
      const cachedResponse = new Response(cachedArrayBuffer, {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });

      const cache = await caches.open(CACHE_NAME);
      await cache.put(testUrl, cachedResponse);

      // decodeAudioDataのモック設定
      const expectedBuffer = createMockAudioBuffer(3.0);
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(expectedBuffer);

      // Act
      const result = await loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal);

      // Assert
      expect(fetch).not.toHaveBeenCalled();
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(result).toBe(expectedBuffer);
    });
  });

  describe("U2: キャッシュミス時", () => {
    it("fetchしてキャッシュに保存し、AudioBufferを返す", async () => {
      // Arrange: キャッシュは空
      const testUrl = "/sample/test.wav";
      const fetchedArrayBuffer = new ArrayBuffer(200);
      const fetchResponse = new Response(fetchedArrayBuffer, {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      });

      vi.mocked(fetch).mockResolvedValue(fetchResponse);

      const expectedBuffer = createMockAudioBuffer(4.0);
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(expectedBuffer);

      // Act
      const result = await loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal);

      // Assert
      expect(fetch).toHaveBeenCalledWith(testUrl, {
        signal: abortController.signal,
      });
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(result).toBe(expectedBuffer);

      // キャッシュに保存されたことを確認
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(testUrl);
      expect(cachedResponse).toBeDefined();
    });
  });

  describe("U3: fetch失敗時（4xx/5xx）", () => {
    it("404エラー時にエラーをスローする", async () => {
      // Arrange
      const testUrl = "/sample/notfound.wav";
      const errorResponse = new Response(null, {
        status: 404,
        statusText: "Not Found",
      });

      vi.mocked(fetch).mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(
        loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal),
      ).rejects.toThrow("Failed to fetch audio: 404 Not Found");

      // キャッシュに保存されていないことを確認
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(testUrl);
      expect(cachedResponse).toBeUndefined();
    });

    it("500エラー時にエラーをスローする", async () => {
      // Arrange
      const testUrl = "/sample/error.wav";
      const errorResponse = new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
      });

      vi.mocked(fetch).mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(
        loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal),
      ).rejects.toThrow("Failed to fetch audio: 500 Internal Server Error");
    });
  });

  describe("U4: AbortSignalでキャンセル時", () => {
    it("中断された場合にAbortErrorをスローする", async () => {
      // Arrange
      const testUrl = "/sample/abort.wav";

      // fetchが呼ばれたときにAbortErrorをスローするようモック
      vi.mocked(fetch).mockImplementation(async (_url, options) => {
        if (options?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        // シグナルがabortされるまで待機
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

      // Act: fetchが開始された後にabort
      const loadPromise = loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal);

      // 即座にabort
      abortController.abort();

      // Assert
      await expect(loadPromise).rejects.toThrow();
      // DOMExceptionの場合、nameでAbortErrorを確認
      await expect(loadPromise).rejects.toMatchObject({
        name: "AbortError",
      });
    });

    it("既にabortされたシグナルで呼び出された場合にエラーをスローする", async () => {
      // Arrange
      const testUrl = "/sample/already-aborted.wav";

      // 事前にabort
      abortController.abort();

      vi.mocked(fetch).mockImplementation(async (_url, options) => {
        if (options?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return new Response(new ArrayBuffer(100), { status: 200 });
      });

      // Act & Assert
      await expect(
        loadAudio(testUrl, mockAudioContext as unknown as AudioContext, abortController.signal),
      ).rejects.toThrow();
    });
  });
});

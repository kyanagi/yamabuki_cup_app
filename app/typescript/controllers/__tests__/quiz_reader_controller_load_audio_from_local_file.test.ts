import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockAudioBuffer, MockAudioContext } from "../../__tests__/mocks/audio-context";
import { loadAudioFromLocalFile } from "../quiz_reader_controller";
import { createMockDirectoryHandle } from "./quiz_reader_controller_test_helpers";

describe("loadAudioFromLocalFile", () => {
  let mockAudioContext: MockAudioContext;
  let abortController: AbortController;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    abortController = new AbortController();
  });

  describe("U1: ファイルが存在する場合", () => {
    it("ローカルファイルからAudioBufferを返す", async () => {
      // Arrange
      const testArrayBuffer = new ArrayBuffer(100);
      const dirHandle = createMockDirectoryHandle({
        "test.wav": testArrayBuffer,
      });

      const expectedBuffer = createMockAudioBuffer(3.0);
      mockAudioContext.decodeAudioData = vi.fn().mockResolvedValue(expectedBuffer);

      // Act
      const result = await loadAudioFromLocalFile(
        "test.wav",
        dirHandle,
        mockAudioContext as unknown as AudioContext,
        abortController.signal,
      );

      // Assert
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(result).toBe(expectedBuffer);
    });
  });

  describe("U2: ファイルが存在しない場合", () => {
    it("NotFoundErrorをスローする", async () => {
      // Arrange
      const dirHandle = createMockDirectoryHandle({});

      // Act & Assert
      await expect(
        loadAudioFromLocalFile(
          "notfound.wav",
          dirHandle,
          mockAudioContext as unknown as AudioContext,
          abortController.signal,
        ),
      ).rejects.toMatchObject({
        name: "NotFoundError",
      });
    });
  });

  describe("U3: AbortSignalでキャンセル時", () => {
    it("既にabortされたシグナルで呼び出された場合にAbortErrorをスローする", async () => {
      // Arrange
      const testArrayBuffer = new ArrayBuffer(100);
      const dirHandle = createMockDirectoryHandle({
        "test.wav": testArrayBuffer,
      });

      // 事前にabort
      abortController.abort();

      // Act & Assert
      await expect(
        loadAudioFromLocalFile(
          "test.wav",
          dirHandle,
          mockAudioContext as unknown as AudioContext,
          abortController.signal,
        ),
      ).rejects.toMatchObject({
        name: "AbortError",
      });
    });
  });
});

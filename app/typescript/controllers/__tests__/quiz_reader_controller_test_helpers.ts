// FileSystemDirectoryHandle のテスト用モック生成ヘルパー
export function createMockDirectoryHandle(files: Record<string, ArrayBuffer>): FileSystemDirectoryHandle {
  return {
    name: "test-folder",
    kind: "directory",
    async getFileHandle(fileName: string) {
      const fileData = files[fileName];
      if (fileData === undefined) {
        throw new DOMException(`File not found: ${fileName}`, "NotFoundError");
      }
      return {
        kind: "file",
        name: fileName,
        async getFile() {
          // jsdom では File.arrayBuffer() がサポートされていないため、
          // モックオブジェクトで arrayBuffer() メソッドを提供
          return {
            name: fileName,
            type: "audio/wav",
            size: fileData.byteLength,
            async arrayBuffer() {
              return fileData;
            },
          } as unknown as File;
        },
      } as FileSystemFileHandle;
    },
  } as FileSystemDirectoryHandle;
}

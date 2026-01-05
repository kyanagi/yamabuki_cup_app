// File System Access API の型宣言
// https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}

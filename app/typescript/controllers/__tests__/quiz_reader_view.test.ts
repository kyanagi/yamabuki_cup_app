import { describe, expect, it, vi } from "vitest";
import { createQuizReaderView, type QuizReaderView } from "../quiz_reader/quiz_reader_view";

type ViewFixture = {
  view: QuizReaderView;
  loadingIcon: HTMLElement;
  loadedIcon: HTMLElement;
  loadErrorIcon: HTMLElement;
  stopIcon: HTMLElement;
  playIcon: HTMLElement;
  pauseIcon: HTMLElement;
  uploadingIcon: HTMLElement;
  uploadedIcon: HTMLElement;
  uploadErrorIcon: HTMLElement;
  mainError: HTMLElement;
};

function createFixture(): ViewFixture {
  document.body.innerHTML = `
    <div>
      <span id="loading" class="is-hidden"></span>
      <span id="loaded" class="is-hidden"></span>
      <span id="load-error" class="is-hidden"></span>
      <span id="stop" class="is-hidden"></span>
      <span id="play" class="is-hidden"></span>
      <span id="pause" class="is-hidden"></span>
      <span id="uploading" class="is-hidden"></span>
      <span id="uploaded" class="is-hidden"></span>
      <span id="upload-error" class="is-hidden"></span>
      <p id="main-error" class="is-hidden"></p>
    </div>
  `;

  const loadingIcon = document.getElementById("loading") as HTMLElement;
  const loadedIcon = document.getElementById("loaded") as HTMLElement;
  const loadErrorIcon = document.getElementById("load-error") as HTMLElement;
  const stopIcon = document.getElementById("stop") as HTMLElement;
  const playIcon = document.getElementById("play") as HTMLElement;
  const pauseIcon = document.getElementById("pause") as HTMLElement;
  const uploadingIcon = document.getElementById("uploading") as HTMLElement;
  const uploadedIcon = document.getElementById("uploaded") as HTMLElement;
  const uploadErrorIcon = document.getElementById("upload-error") as HTMLElement;
  const mainError = document.getElementById("main-error") as HTMLElement;

  const view = createQuizReaderView({
    getVoiceLoadingStatusIcons: () => [loadingIcon, loadedIcon, loadErrorIcon],
    getVoiceLoadingIcon: () => loadingIcon,
    getVoiceLoadedIcon: () => loadedIcon,
    getVoiceLoadErrorIcon: () => loadErrorIcon,
    getPlayStatusIcons: () => [stopIcon, playIcon, pauseIcon],
    getStopIcon: () => stopIcon,
    getPlayIcon: () => playIcon,
    getPauseIcon: () => pauseIcon,
    getResultUploadingStatusIcons: () => [uploadingIcon, uploadedIcon, uploadErrorIcon],
    getResultUploadingIcon: () => uploadingIcon,
    getResultUploadedIcon: () => uploadedIcon,
    getResultUploadErrorIcon: () => uploadErrorIcon,
    getMainError: () => mainError,
  });

  return {
    view,
    loadingIcon,
    loadedIcon,
    loadErrorIcon,
    stopIcon,
    playIcon,
    pauseIcon,
    uploadingIcon,
    uploadedIcon,
    uploadErrorIcon,
    mainError,
  };
}

describe("createQuizReaderView", () => {
  it("LOADING時はローディングアイコンのみ表示する", () => {
    // Arrange
    const fixture = createFixture();

    // Act
    fixture.view.setVoiceLoadingStatusIcon("LOADING");

    // Assert
    expect(fixture.loadingIcon.classList.contains("is-hidden")).toBe(false);
    expect(fixture.loadedIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.loadErrorIcon.classList.contains("is-hidden")).toBe(true);
  });

  it("LOADED時は読み込み完了アイコンのみ表示する", () => {
    // Arrange
    const fixture = createFixture();

    // Act
    fixture.view.setVoiceLoadingStatusIcon("LOADED");

    // Assert
    expect(fixture.loadingIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.loadedIcon.classList.contains("is-hidden")).toBe(false);
    expect(fixture.loadErrorIcon.classList.contains("is-hidden")).toBe(true);
  });

  it("NOT_LOADED時は読み込み失敗アイコンのみ表示する", () => {
    // Arrange
    const fixture = createFixture();

    // Act
    fixture.view.setVoiceLoadingStatusIcon("NOT_LOADED");

    // Assert
    expect(fixture.loadingIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.loadedIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.loadErrorIcon.classList.contains("is-hidden")).toBe(false);
  });

  it("再生状態アイコンを切り替える", () => {
    // Arrange
    const fixture = createFixture();

    // Act & Assert
    fixture.view.setPlayStatusIcon("STANDBY");
    expect(fixture.stopIcon.classList.contains("is-hidden")).toBe(false);
    expect(fixture.playIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.pauseIcon.classList.contains("is-hidden")).toBe(true);

    fixture.view.setPlayStatusIcon("PLAYING");
    expect(fixture.stopIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.playIcon.classList.contains("is-hidden")).toBe(false);
    expect(fixture.pauseIcon.classList.contains("is-hidden")).toBe(true);

    fixture.view.setPlayStatusIcon("PAUSED");
    expect(fixture.stopIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.playIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.pauseIcon.classList.contains("is-hidden")).toBe(false);
  });

  it("アップロード状態アイコンを切り替える", () => {
    // Arrange
    const fixture = createFixture();

    // Act & Assert
    fixture.view.setResultUploadingStatusIcon("NOT_UPLOADING");
    expect(fixture.uploadingIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.uploadedIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.uploadErrorIcon.classList.contains("is-hidden")).toBe(true);

    fixture.view.setResultUploadingStatusIcon("UPLOADING");
    expect(fixture.uploadingIcon.classList.contains("is-hidden")).toBe(false);
    expect(fixture.uploadedIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.uploadErrorIcon.classList.contains("is-hidden")).toBe(true);

    fixture.view.setResultUploadingStatusIcon("UPLOADED");
    expect(fixture.uploadingIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.uploadedIcon.classList.contains("is-hidden")).toBe(false);
    expect(fixture.uploadErrorIcon.classList.contains("is-hidden")).toBe(true);

    fixture.view.setResultUploadingStatusIcon("UPLOAD_ERROR");
    expect(fixture.uploadingIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.uploadedIcon.classList.contains("is-hidden")).toBe(true);
    expect(fixture.uploadErrorIcon.classList.contains("is-hidden")).toBe(false);
  });

  it("showMainError と clearMainError で表示を切り替える", () => {
    // Arrange
    const fixture = createFixture();

    // Act
    fixture.view.showMainError("エラーメッセージ");

    // Assert
    expect(fixture.mainError.textContent).toBe("エラーメッセージ");
    expect(fixture.mainError.classList.contains("is-hidden")).toBe(false);

    // Act
    fixture.view.clearMainError();

    // Assert
    expect(fixture.mainError.textContent).toBe("");
    expect(fixture.mainError.classList.contains("is-hidden")).toBe(true);
  });

  it("targetが欠落していても例外を投げない", () => {
    // Arrange
    const view = createQuizReaderView({
      getVoiceLoadingStatusIcons: () => [],
      getVoiceLoadingIcon: () => null,
      getVoiceLoadedIcon: () => null,
      getVoiceLoadErrorIcon: () => null,
      getPlayStatusIcons: () => [],
      getStopIcon: () => null,
      getPlayIcon: () => null,
      getPauseIcon: () => null,
      getResultUploadingStatusIcons: () => [],
      getResultUploadingIcon: () => null,
      getResultUploadedIcon: () => null,
      getResultUploadErrorIcon: () => null,
      getMainError: () => null,
    });

    // Act & Assert
    expect(() => view.setVoiceLoadingStatusIcon("LOADING")).not.toThrow();
    expect(() => view.setVoiceLoadingStatusIcon("LOADED")).not.toThrow();
    expect(() => view.setVoiceLoadingStatusIcon("NOT_LOADED")).not.toThrow();
    expect(() => view.setPlayStatusIcon("STANDBY")).not.toThrow();
    expect(() => view.setResultUploadingStatusIcon("NOT_UPLOADING")).not.toThrow();
  });

  it("mainError target欠落時にconsole.errorを出す", () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = createQuizReaderView({
      getVoiceLoadingStatusIcons: () => [],
      getVoiceLoadingIcon: () => null,
      getVoiceLoadedIcon: () => null,
      getVoiceLoadErrorIcon: () => null,
      getPlayStatusIcons: () => [],
      getStopIcon: () => null,
      getPlayIcon: () => null,
      getPauseIcon: () => null,
      getResultUploadingStatusIcons: () => [],
      getResultUploadingIcon: () => null,
      getResultUploadedIcon: () => null,
      getResultUploadErrorIcon: () => null,
      getMainError: () => null,
    });

    // Act
    view.showMainError("エラー");
    view.clearMainError();

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalledWith("[quiz_reader_view] mainError target が見つかりません");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

    // Cleanup
    consoleErrorSpy.mockRestore();
  });
});

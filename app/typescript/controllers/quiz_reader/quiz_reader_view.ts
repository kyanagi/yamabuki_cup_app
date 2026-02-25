/**
 * quiz_reader_controller から UI 反映責務を分離した View ヘルパー。
 * アイコン表示切り替えと mainError 表示だけを担当し、通信やドメイン処理は扱わない。
 * target 欠落時は基本的に安全に無視し、mainError 欠落のみ console.error で検知する。
 */

import type { LoadingStatus, VoiceStatus } from "./question_reading_context";

export type ResultUploadingStatus = "NOT_UPLOADING" | "UPLOADING" | "UPLOADED" | "UPLOAD_ERROR";

export type QuizReaderViewDeps = {
  getVoiceLoadingStatusIcons: () => HTMLElement[];
  getVoiceLoadingIcon: () => HTMLElement | null;
  getVoiceLoadedIcon: () => HTMLElement | null;
  getVoiceLoadErrorIcon: () => HTMLElement | null;
  getPlayStatusIcons: () => HTMLElement[];
  getStopIcon: () => HTMLElement | null;
  getPlayIcon: () => HTMLElement | null;
  getPauseIcon: () => HTMLElement | null;
  getResultUploadingStatusIcons: () => HTMLElement[];
  getResultUploadingIcon: () => HTMLElement | null;
  getResultUploadedIcon: () => HTMLElement | null;
  getResultUploadErrorIcon: () => HTMLElement | null;
  getMainError: () => HTMLElement | null;
};

export type QuizReaderView = {
  setVoiceLoadingStatusIcon(status: LoadingStatus): void;
  setPlayStatusIcon(status: VoiceStatus): void;
  setResultUploadingStatusIcon(status: ResultUploadingStatus): void;
  showMainError(message: string): void;
  clearMainError(): void;
};

const MISSING_MAIN_ERROR_TARGET_MESSAGE = "[quiz_reader_view] mainError target が見つかりません";

function hideIcons(icons: HTMLElement[]) {
  for (const icon of icons) {
    icon.classList.add("is-hidden");
  }
}

function showIcon(icon: HTMLElement | null) {
  if (!icon) return;
  icon.classList.remove("is-hidden");
}

export function createQuizReaderView(deps: QuizReaderViewDeps): QuizReaderView {
  return {
    setVoiceLoadingStatusIcon(status: LoadingStatus) {
      hideIcons(deps.getVoiceLoadingStatusIcons());
      switch (status) {
        case "LOADING":
          showIcon(deps.getVoiceLoadingIcon());
          break;
        case "LOADED":
          showIcon(deps.getVoiceLoadedIcon());
          break;
        case "NOT_LOADED":
          showIcon(deps.getVoiceLoadErrorIcon());
          break;
      }
    },

    setPlayStatusIcon(status: VoiceStatus) {
      hideIcons(deps.getPlayStatusIcons());
      switch (status) {
        case "STANDBY":
          showIcon(deps.getStopIcon());
          break;
        case "PLAYING":
          showIcon(deps.getPlayIcon());
          break;
        case "PAUSED":
          showIcon(deps.getPauseIcon());
          break;
      }
    },

    setResultUploadingStatusIcon(status: ResultUploadingStatus) {
      hideIcons(deps.getResultUploadingStatusIcons());
      switch (status) {
        case "NOT_UPLOADING":
          break;
        case "UPLOADING":
          showIcon(deps.getResultUploadingIcon());
          break;
        case "UPLOADED":
          showIcon(deps.getResultUploadedIcon());
          break;
        case "UPLOAD_ERROR":
          showIcon(deps.getResultUploadErrorIcon());
          break;
      }
    },

    showMainError(message: string) {
      const mainError = deps.getMainError();
      if (!mainError) {
        console.error(MISSING_MAIN_ERROR_TARGET_MESSAGE);
        return;
      }
      mainError.textContent = message;
      mainError.classList.remove("is-hidden");
    },

    clearMainError() {
      const mainError = deps.getMainError();
      if (!mainError) {
        console.error(MISSING_MAIN_ERROR_TARGET_MESSAGE);
        return;
      }
      mainError.textContent = "";
      mainError.classList.add("is-hidden");
    },
  };
}

import { afterEach, beforeEach, vi } from "vitest";
import { MockAudioBufferSourceNode, MockAudioContext } from "./mocks/audio-context";
import { MockCacheStorage } from "./mocks/cache-api";

// グローバルモックのセットアップ
const mockCaches = new MockCacheStorage();

beforeEach(() => {
  // AudioContext モック
  vi.stubGlobal("AudioContext", MockAudioContext);

  // Cache API モック
  vi.stubGlobal("caches", mockCaches);

  // fetch モック（テストごとに設定可能）
  vi.stubGlobal("fetch", vi.fn());

  // CSRF トークンのメタタグを追加
  const meta = document.createElement("meta");
  meta.name = "csrf-token";
  meta.content = "test-csrf-token";
  document.head.appendChild(meta);

  // 自動再生完了をデフォルトで有効化
  MockAudioBufferSourceNode.autoComplete = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  mockCaches.clear();
  MockAudioBufferSourceNode.autoComplete = true;
});

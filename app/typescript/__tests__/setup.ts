import { afterEach, beforeEach, vi } from "vitest";
import { MockCacheStorage } from "./mocks/cache-api";

// グローバルモックのセットアップ
const mockCaches = new MockCacheStorage();

beforeEach(() => {
  // Cache API モック
  vi.stubGlobal("caches", mockCaches);

  // fetch モック（テストごとに設定可能）
  vi.stubGlobal("fetch", vi.fn());

  // CSRF トークンのメタタグを追加
  const meta = document.createElement("meta");
  meta.name = "csrf-token";
  meta.content = "test-csrf-token";
  document.head.appendChild(meta);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  mockCaches.clear();
});

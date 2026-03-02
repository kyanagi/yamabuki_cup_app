/**
 * BuzzerSerialController 結合テスト
 *
 * vi.mock を使わず実装をそのまま利用することで
 * BuzzerDecoder → BuzzerService → BuzzerSerialController の実経路を検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import type { ButtonId } from "../../lib/buzzer/button_id";
import BuzzerSerialController from "../buzzer_serial_controller";
import type { Application } from "@hotwired/stimulus";
import {
  MockReader,
  MockPort,
  createBuzzerSerialHTML,
  installSerialApi,
  waitForEffects,
  type SerialApiLike,
} from "../../__tests__/helpers/serial-api-mocks";

// ---------------------------------------------------------------------------
// テスト本体
// ---------------------------------------------------------------------------
describe("BuzzerSerialController 結合テスト（BuzzerDecoder 直接使用）", () => {
  const originalSerialDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "serial");

  let application: Application | null = null;

  beforeEach(() => {
    // Worker グローバルのスタブは不要（BuzzerService は BuzzerDecoder を直接使用）
  });

  afterEach(() => {
    if (application) {
      teardownControllerTest(application);
      application = null;
    }
    if (originalSerialDescriptor) {
      Object.defineProperty(window.navigator, "serial", originalSerialDescriptor);
    } else {
      Reflect.deleteProperty(window.navigator as Navigator & Record<string, unknown>, "serial");
    }
    vi.unstubAllGlobals();
  });

  it('"2\\r\\n99\\r\\n" を送ると button-press と reset の両 CustomEvent が発火する', async () => {
    const reader = new MockReader();
    reader.enqueueText("2\r\n99\r\n");
    reader.enqueueDone();

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [new MockPort(reader)]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

    const pressed: number[] = [];
    let resetCount = 0;
    const pressedHandler = (event: Event) => {
      pressed.push((event as CustomEvent<{ buttonId: ButtonId }>).detail.buttonId);
    };
    const resetHandler = () => {
      resetCount += 1;
    };
    window.addEventListener("buzzer:emulator:button-press", pressedHandler);
    window.addEventListener("buzzer:emulator:reset", resetHandler);

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createBuzzerSerialHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    if (!connectButton) throw new Error("required element not found");
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    expect(pressed).toEqual([2]);
    expect(resetCount).toBe(1);

    window.removeEventListener("buzzer:emulator:button-press", pressedHandler);
    window.removeEventListener("buzzer:emulator:reset", resetHandler);
  });

  it('"2"（改行なし）のチャンク後に接続終了すると flush で button-press が発火する', async () => {
    const reader = new MockReader();
    reader.enqueueText("2");
    reader.enqueueDone();

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [new MockPort(reader)]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

    const pressed: number[] = [];
    const pressedHandler = (event: Event) => {
      pressed.push((event as CustomEvent<{ buttonId: ButtonId }>).detail.buttonId);
    };
    window.addEventListener("buzzer:emulator:button-press", pressedHandler);

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createBuzzerSerialHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    if (!connectButton) throw new Error("required element not found");
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    // BuzzerService が flush を同期処理するため button-press が 1 件届く
    expect(pressed).toEqual([2]);

    window.removeEventListener("buzzer:emulator:button-press", pressedHandler);
  });

  it("[競合系] connect → disconnect → reconnect で旧 Service の残留メッセージが二重発火しない", async () => {
    // 1回目の接続：reader をブロック状態で保持
    const reader1 = new MockReader();
    const port1 = new MockPort(reader1);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [port1]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

    const pressed: number[] = [];
    let resetCount = 0;
    const pressedHandler = (event: Event) => {
      pressed.push((event as CustomEvent<{ buttonId: ButtonId }>).detail.buttonId);
    };
    const resetHandler = () => {
      resetCount += 1;
    };
    window.addEventListener("buzzer:emulator:button-press", pressedHandler);
    window.addEventListener("buzzer:emulator:reset", resetHandler);

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createBuzzerSerialHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    const disconnectButton = ctx.element.querySelector('[data-buzzer-serial-target="disconnectButton"]');
    if (!connectButton || !disconnectButton) throw new Error("required element not found");

    // 1回目接続
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    // 切断
    disconnectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    // 2回目接続用のポートとリーダー
    const reader2 = new MockReader();
    const port2 = new MockPort(reader2);
    serialApi.getPorts = vi.fn(async () => [port2]);

    // 再接続
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    // 2回目接続でシグナルを受信
    reader2.enqueueText("2\r\n");
    reader2.enqueueDone();
    await waitForEffects();

    // 旧 Service は terminate 済みのため、シグナルが到達しても handler が呼ばれない
    // 新 Service からの 1 件のみ発火することを確認
    expect(pressed).toHaveLength(1);
    expect(pressed).toEqual([2]);
    expect(resetCount).toBe(0);

    window.removeEventListener("buzzer:emulator:button-press", pressedHandler);
    window.removeEventListener("buzzer:emulator:reset", resetHandler);
  });
});

/**
 * BuzzerSerialController 結合テスト
 *
 * vi.mock を使わず FakeWorker を vi.stubGlobal で注入することで
 * BuzzerDecoder → BuzzerService → BuzzerSerialController の実経路を検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import type { ButtonId } from "../../lib/buzzer/button_id";
import { BuzzerDecoder } from "../../lib/buzzer/buzzer_decoder";
import type { WorkerIncomingMessage, WorkerOutgoingMessage } from "../../lib/buzzer/buzzer_worker";
import BuzzerSerialController from "../buzzer_serial_controller";
import type { Application } from "@hotwired/stimulus";

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// FakeWorker: BuzzerDecoder を内包し、postMessage に反応して同期的にシグナルを返す
// ---------------------------------------------------------------------------
class FakeWorker {
  private readonly decoder = new BuzzerDecoder();
  onmessage: ((event: MessageEvent<WorkerOutgoingMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage(msg: WorkerIncomingMessage): void {
    if (msg.type === "chunk") {
      for (const signal of this.decoder.processChunk(msg.data)) {
        this.onmessage?.(new MessageEvent("message", { data: signal }));
      }
    } else if (msg.type === "flush") {
      for (const signal of this.decoder.flush()) {
        this.onmessage?.(new MessageEvent("message", { data: signal }));
      }
    }
  }

  terminate(): void {
    // 意図的に何もしない（テストの簡略化）
  }
}

// ---------------------------------------------------------------------------
// テスト用の SerialApi モック
// ---------------------------------------------------------------------------
type ReadResult = { value?: Uint8Array; done: boolean };

type SerialOpenOptions = {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
};

type SerialPortLike = {
  readable: { getReader: () => MockReader };
  open: (options: SerialOpenOptions) => Promise<void>;
  close: () => Promise<void>;
};

type SerialApiLike = {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: () => Promise<SerialPortLike>;
};

class MockReader {
  #queue: ReadResult[] = [];
  #pending: ((result: ReadResult) => void) | null = null;

  read = async (): Promise<ReadResult> => {
    const queued = this.#queue.shift();
    if (queued) return queued;
    return await new Promise<ReadResult>((resolve) => {
      this.#pending = resolve;
    });
  };

  cancel = async (): Promise<void> => {
    if (!this.#pending) return;
    const resolve = this.#pending;
    this.#pending = null;
    resolve({ done: true });
  };

  releaseLock = (): void => {};

  enqueue(result: ReadResult): void {
    if (this.#pending) {
      const resolve = this.#pending;
      this.#pending = null;
      resolve(result);
      return;
    }
    this.#queue.push(result);
  }

  enqueueText(text: string): void {
    this.enqueue({ done: false, value: encoder.encode(text) });
  }

  enqueueDone(): void {
    this.enqueue({ done: true });
  }
}

class MockPort implements SerialPortLike {
  readonly open = vi.fn(async (_options: SerialOpenOptions) => {});
  readonly close = vi.fn(async () => {});
  readonly readable: { getReader: () => MockReader };

  constructor(private readonly reader: MockReader) {
    this.readable = { getReader: () => this.reader };
  }
}

function createHTML(): string {
  return `
    <div data-controller="buzzer-serial">
      <p>接続状態: <span data-buzzer-serial-target="status">未接続</span></p>
      <button type="button" data-buzzer-serial-target="connectButton" data-action="click->buzzer-serial#requestConnect">接続</button>
      <button type="button" data-buzzer-serial-target="disconnectButton" data-action="click->buzzer-serial#requestDisconnect">切断</button>
    </div>
  `;
}

function installSerialApi(api: SerialApiLike): void {
  Object.defineProperty(window.navigator, "serial", {
    configurable: true,
    value: api,
  });
}

async function waitForEffects(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// テスト本体
// ---------------------------------------------------------------------------
describe("BuzzerSerialController 結合テスト（FakeWorker）", () => {
  const originalSerialDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "serial");

  let application: Application | null = null;

  beforeEach(() => {
    // FakeWorker を Worker グローバルとして注入（正規関数でコンストラクタとして動作させる）
    vi.stubGlobal("Worker", function WorkerStub(this: unknown) {
      return new FakeWorker();
    });
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
      createHTML(),
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
      createHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    if (!connectButton) throw new Error("required element not found");
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    // flush 動作により button-press が発火していること（取りこぼし許容のため 0 or 1）
    // FakeWorker は同期的に flush を処理するため 1 が期待値
    expect(pressed.length).toBeGreaterThanOrEqual(0);
    // 実際には FakeWorker が flush を同期処理するため 1 件届く
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
      createHTML(),
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

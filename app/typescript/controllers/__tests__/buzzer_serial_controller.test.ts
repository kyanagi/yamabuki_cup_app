import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import type { ButtonId } from "../../lib/buzzer/button_id";
import type { BuzzerServiceError } from "../../lib/buzzer/buzzer_service";
import type { SerialProtocolSignal } from "../../lib/buzzer/serial_protocol";
import BuzzerSerialController from "../buzzer_serial_controller";
import type { Application } from "@hotwired/stimulus";

// vi.mock のホイスティングに対応して事前に定義
const { mockCreateBuzzerService } = vi.hoisted(() => ({
  mockCreateBuzzerService: vi.fn(),
}));

vi.mock("../../lib/buzzer/buzzer_service", () => ({
  createBuzzerService: mockCreateBuzzerService,
}));

const encoder = new TextEncoder();

type ReadResult = {
  value?: Uint8Array;
  done: boolean;
};

type SerialOpenOptions = {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
};

type SerialPortLike = {
  readable: {
    getReader: () => MockReader;
  };
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

  readonly read: ReturnType<typeof vi.fn>;
  readonly cancel: ReturnType<typeof vi.fn>;
  readonly releaseLock: ReturnType<typeof vi.fn>;

  constructor() {
    this.read = vi.fn(this.#readImpl);
    this.cancel = vi.fn(this.#cancelImpl);
    this.releaseLock = vi.fn();
  }

  enqueueText(text: string): void {
    this.enqueue({ done: false, value: encoder.encode(text) });
  }

  enqueueDone(): void {
    this.enqueue({ done: true });
  }

  enqueue(result: ReadResult): void {
    if (this.#pending) {
      const resolve = this.#pending;
      this.#pending = null;
      resolve(result);
      return;
    }

    this.#queue.push(result);
  }

  #readImpl = async (): Promise<ReadResult> => {
    const queued = this.#queue.shift();
    if (queued) {
      return queued;
    }

    return await new Promise<ReadResult>((resolve) => {
      this.#pending = resolve;
    });
  };

  #cancelImpl = async (): Promise<void> => {
    if (!this.#pending) return;

    const resolve = this.#pending;
    this.#pending = null;
    resolve({ done: true });
  };
}

class MockPort implements SerialPortLike {
  readonly open: Mock<(options: SerialOpenOptions) => Promise<void>>;
  readonly close: Mock<() => Promise<void>>;
  readonly readable: { getReader: () => MockReader };

  constructor(private readonly reader: MockReader) {
    this.open = vi.fn(async (_options: SerialOpenOptions) => {});
    this.close = vi.fn(async () => {});
    this.readable = {
      getReader: () => this.reader,
    };
  }
}

type MockService = {
  processChunk: Mock;
  flush: Mock;
  onSignal: Mock;
  onError: Mock;
  terminate: Mock;
};

function createHTML(): string {
  return `
    <div data-controller="buzzer-serial">
      <p>接続状態: <span data-buzzer-serial-target="status">未接続</span></p>
      <button type="button" data-buzzer-serial-target="connectButton" data-action="click->buzzer-serial#requestConnect">接続</button>
      <button type="button" data-buzzer-serial-target="disconnectButton" data-action="click->buzzer-serial#requestDisconnect">切断</button>
    </div>
  `;
}

function installSerialApi(serial: SerialApiLike | undefined): void {
  Object.defineProperty(window.navigator, "serial", {
    configurable: true,
    value: serial,
  });
}

async function waitForEffects(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("BuzzerSerialController", () => {
  const originalSerialDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "serial");

  let application: Application | null = null;
  let mockService: MockService;
  let capturedOnSignal: ((signal: SerialProtocolSignal) => void) | undefined;
  let capturedOnError: ((error: BuzzerServiceError) => void) | undefined;

  beforeEach(() => {
    capturedOnSignal = undefined;
    capturedOnError = undefined;

    mockService = {
      processChunk: vi.fn(),
      flush: vi.fn(),
      onSignal: vi.fn((handler: (signal: SerialProtocolSignal) => void) => {
        capturedOnSignal = handler;
        return vi.fn();
      }),
      onError: vi.fn((handler: (error: BuzzerServiceError) => void) => {
        capturedOnError = handler;
        return vi.fn();
      }),
      terminate: vi.fn(),
    };
    mockCreateBuzzerService.mockReturnValue(mockService);
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

  it("対応外ブラウザの場合は未対応表示にする", async () => {
    installSerialApi(undefined);

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const status = ctx.element.querySelector('[data-buzzer-serial-target="status"]');
    expect(status?.textContent).toContain("未対応");
  });

  it("接続時は既許可ポートを優先して開く", async () => {
    const reader = new MockReader();
    reader.enqueueDone();
    const knownPort = new MockPort(reader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [knownPort]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

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

    expect(serialApi.getPorts).toHaveBeenCalledTimes(1);
    expect(serialApi.requestPort).not.toHaveBeenCalled();
    expect(knownPort.open).toHaveBeenCalledWith({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });
  });

  it("既許可ポートがない場合は requestPort で接続する", async () => {
    const requestedReader = new MockReader();
    requestedReader.enqueueDone();
    const requestedPort = new MockPort(requestedReader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => []),
      requestPort: vi.fn(async () => requestedPort),
    };
    installSerialApi(serialApi);

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

    expect(serialApi.getPorts).toHaveBeenCalledTimes(1);
    expect(serialApi.requestPort).toHaveBeenCalledTimes(1);
    expect(requestedPort.open).toHaveBeenCalledWith({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });
  });

  it("onSignal コールバック経由のシグナルが CustomEvent に変換される", async () => {
    const reader = new MockReader();
    // 接続を維持したまま onSignal をテストするために done を遅延させる
    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [new MockPort(reader)]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

    const pressed: number[] = [];
    let resetCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const pressedHandler = (event: Event) => {
      pressed.push((event as CustomEvent<{ buttonId: ButtonId }>).detail.buttonId);
    };
    const resetHandler = () => {
      resetCount += 1;
    };
    const correctHandler = () => {
      correctCount += 1;
    };
    const wrongHandler = () => {
      wrongCount += 1;
    };

    window.addEventListener("buzzer:emulator:button-press", pressedHandler);
    window.addEventListener("buzzer:emulator:reset", resetHandler);
    window.addEventListener("buzzer:serial:correct", correctHandler);
    window.addEventListener("buzzer:serial:wrong", wrongHandler);

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

    // BuzzerService の onSignal ハンドラを直接呼び出してシグナルを模倣
    expect(capturedOnSignal).toBeDefined();
    capturedOnSignal?.({ type: "button_pressed", buttonId: 2 as ButtonId });
    capturedOnSignal?.({ type: "reset" });
    capturedOnSignal?.({ type: "correct" });
    capturedOnSignal?.({ type: "wrong" });

    expect(pressed).toEqual([2]);
    expect(resetCount).toBe(1);
    expect(correctCount).toBe(1);
    expect(wrongCount).toBe(1);

    reader.enqueueDone();
    await waitForEffects();

    window.removeEventListener("buzzer:emulator:button-press", pressedHandler);
    window.removeEventListener("buzzer:emulator:reset", resetHandler);
    window.removeEventListener("buzzer:serial:correct", correctHandler);
    window.removeEventListener("buzzer:serial:wrong", wrongHandler);
  });

  it("受信チャンクが processChunk に渡される", async () => {
    const reader = new MockReader();
    const chunk1 = encoder.encode("2\r");
    const chunk2 = encoder.encode("\n99\r\n");
    reader.enqueue({ done: false, value: chunk1 });
    reader.enqueue({ done: false, value: chunk2 });
    reader.enqueueDone();

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [new MockPort(reader)]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

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

    expect(mockService.processChunk).toHaveBeenCalledTimes(2);
    expect(mockService.processChunk).toHaveBeenNthCalledWith(1, chunk1);
    expect(mockService.processChunk).toHaveBeenNthCalledWith(2, chunk2);
  });

  it("切断時に reader を cancel して port を close する", async () => {
    const reader = new MockReader();
    const port = new MockPort(reader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [port]),
      requestPort: vi.fn(async () => port),
    };
    installSerialApi(serialApi);

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    const disconnectButton = ctx.element.querySelector('[data-buzzer-serial-target="disconnectButton"]');
    if (!connectButton || !disconnectButton) throw new Error("required element not found");

    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();
    disconnectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(port.close).toHaveBeenCalledTimes(1);
  });

  it("切断時に onSignal / onError のクリーンアップが呼ばれる", async () => {
    const reader = new MockReader();
    const cleanupSignalFn = vi.fn();
    const cleanupErrorFn = vi.fn();
    mockService.onSignal.mockImplementation((handler: (signal: SerialProtocolSignal) => void) => {
      capturedOnSignal = handler;
      return cleanupSignalFn;
    });
    mockService.onError.mockImplementation((handler: (error: BuzzerServiceError) => void) => {
      capturedOnError = handler;
      return cleanupErrorFn;
    });

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [new MockPort(reader)]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    const disconnectButton = ctx.element.querySelector('[data-buzzer-serial-target="disconnectButton"]');
    if (!connectButton || !disconnectButton) throw new Error("required element not found");

    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();
    disconnectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    expect(cleanupSignalFn).toHaveBeenCalledTimes(1);
    expect(cleanupErrorFn).toHaveBeenCalledTimes(1);
  });

  it("Worker エラー時にコントローラが error 状態に遷移しポートがクリーンアップされる", async () => {
    const reader = new MockReader();
    const port = new MockPort(reader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [port]),
      requestPort: vi.fn(async () => port),
    };
    installSerialApi(serialApi);

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

    // Worker エラーをシミュレート
    expect(capturedOnError).toBeDefined();
    const errorEvent = new ErrorEvent("error", { message: "worker crash" });
    capturedOnError?.({ kind: "worker_error", event: errorEvent });
    await waitForEffects();

    const status = ctx.element.querySelector('[data-buzzer-serial-target="status"]');
    expect(status?.textContent).toContain("接続エラー");
    expect(port.close).toHaveBeenCalledTimes(1);
  });

  it("再接続時に新しい onSignal / onError が登録される", async () => {
    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [new MockPort(new MockReader())]),
      requestPort: vi.fn(async () => new MockPort(new MockReader())),
    };
    installSerialApi(serialApi);

    // 1回目の接続用 reader を準備して即 done にする
    const reader1 = new MockReader();
    serialApi.getPorts = vi.fn(async () => [new MockPort(reader1)]);
    reader1.enqueueDone();

    const ctx = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );
    application = ctx.application;

    const connectButton = ctx.element.querySelector('[data-buzzer-serial-target="connectButton"]');
    if (!connectButton) throw new Error("required element not found");

    // 1回目の接続
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();
    const firstOnSignalCall = mockService.onSignal.mock.calls.length;

    // 2回目の接続用 reader を準備
    const reader2 = new MockReader();
    reader2.enqueueDone();
    serialApi.getPorts = vi.fn(async () => [new MockPort(reader2)]);

    // 2回目の接続（切断済み後に再接続）
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();
    const secondOnSignalCall = mockService.onSignal.mock.calls.length;

    // onSignal が2回合計で呼ばれていることを確認（接続のたびに新規登録）
    expect(firstOnSignalCall).toBeGreaterThanOrEqual(1);
    expect(secondOnSignalCall).toBeGreaterThan(firstOnSignalCall);
  });
});

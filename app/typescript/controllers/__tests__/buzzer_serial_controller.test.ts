import { afterEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import type { ButtonId } from "../../lib/buzzer/button_id";
import BuzzerSerialController from "../buzzer_serial_controller";

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
  readonly open: ReturnType<typeof vi.fn>;
  readonly close: ReturnType<typeof vi.fn>;
  readonly readable: { getReader: () => MockReader };

  constructor(private readonly reader: MockReader) {
    this.open = vi.fn(async (_options: SerialOpenOptions) => {});
    this.close = vi.fn(async () => {});
    this.readable = {
      getReader: () => this.reader,
    };
  }
}

function createHTML(): string {
  return `
    <div data-controller="buzzer-serial">
      <p>接続状態: <span data-buzzer-serial-target="status">未接続</span></p>
      <button type="button" data-buzzer-serial-target="connectButton" data-action="click->buzzer-serial#connect">接続</button>
      <button type="button" data-buzzer-serial-target="disconnectButton" data-action="click->buzzer-serial#disconnect">切断</button>
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

  afterEach(() => {
    if (originalSerialDescriptor) {
      Object.defineProperty(window.navigator, "serial", originalSerialDescriptor);
    } else {
      Reflect.deleteProperty(window.navigator as Navigator & Record<string, unknown>, "serial");
    }
    vi.unstubAllGlobals();
  });

  it("対応外ブラウザの場合は未対応表示にする", async () => {
    installSerialApi(undefined);

    const { application, element } = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );

    const status = element.querySelector('[data-buzzer-serial-target="status"]');
    expect(status?.textContent).toContain("未対応");

    teardownControllerTest(application);
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

    const { application, element } = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );

    const connectButton = element.querySelector('[data-buzzer-serial-target="connectButton"]');
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

    teardownControllerTest(application);
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

    const { application, element } = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );

    const connectButton = element.querySelector('[data-buzzer-serial-target="connectButton"]');
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

    teardownControllerTest(application);
  });

  it("受信行をイベントへ変換して送出する", async () => {
    const reader = new MockReader();
    reader.enqueueText("2\r\n51\r\n52\r\n99\r\n");
    reader.enqueueDone();
    const port = new MockPort(reader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [port]),
      requestPort: vi.fn(async () => port),
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

    const { application, element } = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );

    const connectButton = element.querySelector('[data-buzzer-serial-target="connectButton"]');
    if (!connectButton) throw new Error("required element not found");
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    expect(pressed).toEqual([2]);
    expect(resetCount).toBe(1);
    expect(correctCount).toBe(1);
    expect(wrongCount).toBe(1);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:emulator:button-press", pressedHandler);
    window.removeEventListener("buzzer:emulator:reset", resetHandler);
    window.removeEventListener("buzzer:serial:correct", correctHandler);
    window.removeEventListener("buzzer:serial:wrong", wrongHandler);
  });

  it("分割受信された行も正しく処理する", async () => {
    const reader = new MockReader();
    reader.enqueueText("2\r");
    reader.enqueueText("\n99\r");
    reader.enqueueText("\n");
    reader.enqueueDone();
    const port = new MockPort(reader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [port]),
      requestPort: vi.fn(async () => port),
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

    const { application, element } = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );

    const connectButton = element.querySelector('[data-buzzer-serial-target="connectButton"]');
    if (!connectButton) throw new Error("required element not found");
    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    expect(pressed).toEqual([2]);
    expect(resetCount).toBe(1);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:emulator:button-press", pressedHandler);
    window.removeEventListener("buzzer:emulator:reset", resetHandler);
  });

  it("切断時に reader を cancel して port を close する", async () => {
    const reader = new MockReader();
    const port = new MockPort(reader);

    const serialApi: SerialApiLike = {
      getPorts: vi.fn(async () => [port]),
      requestPort: vi.fn(async () => port),
    };
    installSerialApi(serialApi);

    const { application, element } = await setupControllerTest<BuzzerSerialController>(
      BuzzerSerialController,
      createHTML(),
      "buzzer-serial",
    );

    const connectButton = element.querySelector('[data-buzzer-serial-target="connectButton"]');
    const disconnectButton = element.querySelector('[data-buzzer-serial-target="disconnectButton"]');
    if (!connectButton || !disconnectButton) throw new Error("required element not found");

    connectButton.dispatchEvent(new Event("click"));
    await waitForEffects();
    disconnectButton.dispatchEvent(new Event("click"));
    await waitForEffects();

    expect(reader.cancel).toHaveBeenCalledTimes(1);
    expect(port.close).toHaveBeenCalledTimes(1);

    teardownControllerTest(application);
  });
});

/**
 * BuzzerSerialController テスト用のシリアル API モック共有ヘルパー。
 * 単体テスト・結合テスト両方で利用する。
 */
import type { Mock } from "vitest";
import { vi } from "vitest";

export type ReadResult = {
  value?: Uint8Array;
  done: boolean;
};

export type SerialOpenOptions = {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: string;
};

export type SerialPortLike = {
  readable: { getReader: () => MockReader };
  open: (options: SerialOpenOptions) => Promise<void>;
  close: () => Promise<void>;
};

export type SerialApiLike = {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: () => Promise<SerialPortLike>;
};

const encoder = new TextEncoder();

export class MockReader {
  #queue: ReadResult[] = [];
  #pending: ((result: ReadResult) => void) | null = null;

  readonly read: Mock<() => Promise<ReadResult>>;
  readonly cancel: Mock<() => Promise<void>>;
  readonly releaseLock: Mock<() => void>;

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
    if (queued) return queued;
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

export class MockPort implements SerialPortLike {
  readonly open: Mock<(options: SerialOpenOptions) => Promise<void>>;
  readonly close: Mock<() => Promise<void>>;
  readonly readable: { getReader: () => MockReader };

  constructor(private readonly reader: MockReader) {
    this.open = vi.fn(async (_options: SerialOpenOptions) => {});
    this.close = vi.fn(async () => {});
    this.readable = { getReader: () => this.reader };
  }
}

export function createBuzzerSerialHTML(): string {
  return `
    <div data-controller="buzzer-serial">
      <p>接続状態: <span data-buzzer-serial-target="status">未接続</span></p>
      <p>最終押下: <span data-buzzer-serial-target="lastPressed">未入力</span></p>
      <button type="button" data-buzzer-serial-target="connectButton" data-action="click->buzzer-serial#requestConnect">接続</button>
      <button type="button" data-buzzer-serial-target="disconnectButton" data-action="click->buzzer-serial#requestDisconnect">切断</button>
    </div>
  `;
}

export function installSerialApi(api: SerialApiLike | undefined): void {
  Object.defineProperty(window.navigator, "serial", {
    configurable: true,
    value: api,
  });
}

export async function waitForEffects(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

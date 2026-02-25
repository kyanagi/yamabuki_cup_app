import { Controller } from "@hotwired/stimulus";
import type { ButtonId } from "../lib/buzzer/button_id";
import {
  BUZZER_EMULATOR_BUTTON_PRESS_EVENT,
  BUZZER_EMULATOR_RESET_EVENT,
  BUZZER_SERIAL_CORRECT_EVENT,
  BUZZER_SERIAL_WRONG_EVENT,
} from "../lib/buzzer/events";
import { parseSerialProtocolLine } from "../lib/buzzer/serial_protocol";

const SERIAL_OPEN_OPTIONS = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
} as const;

const STATUS_TEXT = {
  unsupported: "未対応（Web Serial API非対応）",
  disconnected: "未接続",
  connecting: "接続中",
  connected: "接続済",
  error: "接続エラー（未接続）",
} as const;

const STATUS_CLASS = {
  unsupported: "is-dark",
  disconnected: "is-warning",
  connecting: "is-info",
  connected: "is-success",
  error: "is-danger",
} as const;

type ConnectionState = keyof typeof STATUS_TEXT;

type ReaderResult = {
  value?: Uint8Array;
  done: boolean;
};

type SerialReaderLike = {
  read: () => Promise<ReaderResult>;
  cancel: () => Promise<void>;
  releaseLock: () => void;
};

type SerialPortLike = {
  open: (options: { baudRate: number; dataBits?: number; stopBits?: number; parity?: string }) => Promise<void>;
  close: () => Promise<void>;
  readable: { getReader: () => SerialReaderLike } | null;
};

type SerialApiLike = {
  getPorts: () => Promise<SerialPortLike[]>;
  requestPort: () => Promise<SerialPortLike>;
};

type NavigatorWithSerial = Navigator & { serial?: SerialApiLike };

export default class extends Controller {
  static targets = ["status", "connectButton", "disconnectButton"];

  declare statusTarget: HTMLElement;
  declare connectButtonTarget: HTMLButtonElement;
  declare disconnectButtonTarget: HTMLButtonElement;
  declare readonly hasStatusTarget: boolean;
  declare readonly hasConnectButtonTarget: boolean;
  declare readonly hasDisconnectButtonTarget: boolean;

  #port: SerialPortLike | null = null;
  #reader: SerialReaderLike | null = null;
  #readLoopPromise: Promise<void> | null = null;
  #buffer = "";
  #isDisconnecting = false;
  #state: ConnectionState = "disconnected";

  connect(event?: Event): void {
    if (event instanceof Event) {
      event.preventDefault();
      void this.#connectToPort();
      return;
    }

    this.#setState(this.#serialApi ? "disconnected" : "unsupported");
  }

  disconnect(event?: Event): void {
    if (event instanceof Event) {
      event.preventDefault();
    }

    void this.#disconnectFromPort();
  }

  async #connectToPort(): Promise<void> {
    const serialApi = this.#serialApi;
    if (!serialApi) {
      this.#setState("unsupported");
      return;
    }
    if (this.#state === "connecting" || this.#state === "connected") return;

    this.#setState("connecting");

    try {
      const knownPorts = await serialApi.getPorts();
      const port = knownPorts[0] ?? (await serialApi.requestPort());
      await port.open(SERIAL_OPEN_OPTIONS);

      const reader = port.readable?.getReader();
      if (!reader) {
        throw new Error("serial reader is not available");
      }

      this.#port = port;
      this.#reader = reader;
      this.#buffer = "";
      this.#isDisconnecting = false;
      this.#setState("connected");
      this.#readLoopPromise = this.#startReadLoop(reader);
    } catch (error) {
      await this.#cleanupPort();
      if (this.#isUserCancellationError(error)) {
        this.#setState("disconnected");
      } else {
        this.#setState("error");
      }
    }
  }

  async #disconnectFromPort(): Promise<void> {
    this.#isDisconnecting = true;

    const reader = this.#reader;
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }

    const readLoopPromise = this.#readLoopPromise;
    if (readLoopPromise) {
      try {
        await readLoopPromise;
      } catch {
        // ignore
      }
    }

    await this.#cleanupPort();
    this.#setState(this.#serialApi ? "disconnected" : "unsupported");
    this.#isDisconnecting = false;
  }

  async #startReadLoop(reader: SerialReaderLike): Promise<void> {
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        this.#processChunk(decoder.decode(value, { stream: true }));
      }

      const decodedTail = decoder.decode();
      if (decodedTail.length > 0) {
        this.#processChunk(decodedTail);
      }
      if (this.#buffer.length > 0) {
        this.#handleLine(this.#buffer);
        this.#buffer = "";
      }

      if (!this.#isDisconnecting) {
        await this.#cleanupPort();
        this.#setState("disconnected");
      }
    } catch (error) {
      if (this.#isDisconnecting) return;

      await this.#cleanupPort();
      this.#setState(this.#isUserCancellationError(error) ? "disconnected" : "error");
    } finally {
      reader.releaseLock();
      if (this.#reader === reader) {
        this.#reader = null;
      }
      this.#readLoopPromise = null;
    }
  }

  #processChunk(chunk: string): void {
    const lines = `${this.#buffer}${chunk}`.split(/\r?\n/);
    this.#buffer = lines.pop() ?? "";

    for (const line of lines) {
      this.#handleLine(line);
    }
  }

  #handleLine(line: string): void {
    const signal = parseSerialProtocolLine(line);
    switch (signal.type) {
      case "button_pressed":
        window.dispatchEvent(
          new CustomEvent<{ buttonId: ButtonId }>(BUZZER_EMULATOR_BUTTON_PRESS_EVENT, {
            detail: { buttonId: signal.buttonId },
          }),
        );
        return;
      case "reset":
        window.dispatchEvent(new CustomEvent(BUZZER_EMULATOR_RESET_EVENT));
        return;
      case "correct":
        window.dispatchEvent(new CustomEvent(BUZZER_SERIAL_CORRECT_EVENT));
        return;
      case "wrong":
        window.dispatchEvent(new CustomEvent(BUZZER_SERIAL_WRONG_EVENT));
        return;
      case "log":
        return;
      default:
        return;
    }
  }

  async #cleanupPort(): Promise<void> {
    const port = this.#port;
    this.#port = null;
    this.#reader = null;
    this.#readLoopPromise = null;
    this.#buffer = "";

    if (!port) return;

    try {
      await port.close();
    } catch {
      // ignore
    }
  }

  #isUserCancellationError(error: unknown): boolean {
    if (!(error instanceof DOMException)) return false;
    return error.name === "AbortError" || error.name === "NotFoundError";
  }

  #setState(state: ConnectionState): void {
    this.#state = state;

    if (this.hasStatusTarget) {
      this.statusTarget.textContent = STATUS_TEXT[state];
      this.statusTarget.classList.remove(...Object.values(STATUS_CLASS));
      this.statusTarget.classList.add(STATUS_CLASS[state]);
    }

    if (this.hasConnectButtonTarget) {
      this.connectButtonTarget.disabled = state === "unsupported" || state === "connecting" || state === "connected";
    }
    if (this.hasDisconnectButtonTarget) {
      this.disconnectButtonTarget.disabled = state !== "connected";
    }
  }

  get #serialApi(): SerialApiLike | undefined {
    return (navigator as NavigatorWithSerial).serial;
  }
}

import { Controller } from "@hotwired/stimulus";
import type { ButtonId } from "../lib/buzzer/button_id";
import { createBuzzerService } from "../lib/buzzer/buzzer_service";
import type { BuzzerService } from "../lib/buzzer/buzzer_service";
import {
  BUZZER_EMULATOR_BUTTON_PRESS_EVENT,
  BUZZER_EMULATOR_RESET_EVENT,
  BUZZER_SERIAL_CORRECT_EVENT,
  BUZZER_SERIAL_WRONG_EVENT,
} from "../lib/buzzer/events";
import type { SerialProtocolSignal } from "../lib/buzzer/serial_protocol";

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
  #isDisconnecting = false;
  #state: ConnectionState = "disconnected";

  // BuzzerService のライフサイクル管理
  #service: BuzzerService | null = null;
  #cleanupSignal: (() => void) | null = null;

  connect(): void {
    this.#setState(this.#serialApi ? "disconnected" : "unsupported");
  }

  disconnect(): void {
    void this.#disconnectFromPort();
  }

  requestConnect(event: Event): void {
    event.preventDefault();
    void this.#connectToPort();
  }

  requestDisconnect(event: Event): void {
    event.preventDefault();
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

      // BuzzerService を起動してシグナルハンドラを登録
      this.#service = createBuzzerService();
      this.#cleanupSignal = this.#service.onSignal((signal) => {
        this.#handleSignal(signal);
      });

      this.#port = port;
      this.#reader = reader;
      this.#isDisconnecting = false;
      this.#setState("connected");
      this.#readLoopPromise = this.#startReadLoop(reader);
    } catch (error) {
      this.#cleanupService();
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
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        this.#service?.processChunk(value);
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
      // 切断時は flush を fire-and-forget で投げて即 terminate する。
      // 残留バッファのシグナルは取りこぼし得るが、運用上許容する仕様とする。
      this.#service?.flush();
      this.#cleanupService();
      reader.releaseLock();
      if (this.#reader === reader) {
        this.#reader = null;
      }
      this.#readLoopPromise = null;
    }
  }

  /** シリアルシグナルを対応する CustomEvent に変換して window へ送出する */
  #handleSignal(signal: SerialProtocolSignal): void {
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

  /** BuzzerService の購読を解除してサービスを終了する（全経路共通） */
  #cleanupService(): void {
    this.#cleanupSignal?.();
    this.#cleanupSignal = null;
    this.#service?.terminate();
    this.#service = null;
  }

  async #cleanupPort(): Promise<void> {
    const port = this.#port;
    this.#port = null;
    this.#reader = null;
    this.#readLoopPromise = null;

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

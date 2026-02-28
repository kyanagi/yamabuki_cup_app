import { afterEach, describe, expect, it, vi } from "vitest";
import type { BuzzerServiceError } from "../buzzer_service";
import { createBuzzerService } from "../buzzer_service";
import type { WorkerIncomingMessage, WorkerOutgoingMessage } from "../buzzer_worker";
import type { SerialProtocolSignal } from "../serial_protocol";

const encoder = new TextEncoder();

/**
 * テスト用の最小限 Worker モック。
 * postMessage で受け取ったメッセージを記録し、
 * onmessage / onerror / onmessageerror を外部から呼べるようにする。
 */
class FakeWorker {
  readonly sentMessages: WorkerIncomingMessage[] = [];
  readonly terminateCalls: number[] = [];
  onmessage: ((event: MessageEvent<WorkerOutgoingMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage(msg: WorkerIncomingMessage): void {
    this.sentMessages.push(msg);
  }

  terminate(): void {
    this.terminateCalls.push(Date.now());
  }

  simulateMessage(signal: WorkerOutgoingMessage): void {
    this.onmessage?.(new MessageEvent("message", { data: signal }));
  }

  simulateError(event: ErrorEvent): void {
    this.onerror?.(event);
  }

  simulateMessageError(event: MessageEvent): void {
    this.onmessageerror?.(event);
  }
}

class AsyncFlushWorker extends FakeWorker {
  override postMessage(msg: WorkerIncomingMessage): void {
    super.postMessage(msg);

    if (msg.type === "flush") {
      setTimeout(() => {
        this.simulateMessage({ type: "reset" });
      }, 0);
    }
  }
}

/** workerFactory として FakeWorker を注入するヘルパー */
function setup(): { service: ReturnType<typeof createBuzzerService>; worker: FakeWorker } {
  const worker = new FakeWorker();
  const service = createBuzzerService(() => worker as unknown as Worker);
  return { service, worker };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BuzzerService", () => {
  it("processChunk が Worker に { type: 'chunk', data } を postMessage する", () => {
    const { service, worker } = setup();
    const chunk = encoder.encode("2\r\n");
    service.processChunk(chunk);

    expect(worker.sentMessages).toHaveLength(1);
    const msg = worker.sentMessages[0];
    expect(msg?.type).toBe("chunk");
    if (msg?.type === "chunk") {
      expect(msg.data).toBe(chunk);
    }
  });

  it("Worker からのシグナルメッセージが onSignal ハンドラに渡る", () => {
    const { service, worker } = setup();
    const received: SerialProtocolSignal[] = [];
    service.onSignal((s) => received.push(s));

    const signal: SerialProtocolSignal = { type: "reset" };
    worker.simulateMessage(signal);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(signal);
  });

  it("flush() が Worker に { type: 'flush' } を postMessage する（同期・ACK なし）", () => {
    const { service, worker } = setup();
    service.flush();

    expect(worker.sentMessages).toHaveLength(1);
    expect(worker.sentMessages[0]).toEqual({ type: "flush" });
  });

  it("flush() 後も terminate() は即時に実行され、遅延メッセージは配信保証しない（仕様）", () => {
    vi.useFakeTimers();
    try {
      const worker = new AsyncFlushWorker();
      const service = createBuzzerService(() => worker as unknown as Worker);
      const received: SerialProtocolSignal[] = [];
      service.onSignal((signal) => received.push(signal));

      service.flush();
      service.terminate();
      // flush の ACK を待たず、terminate が即時に呼ばれることを固定する
      expect(worker.sentMessages).toContainEqual({ type: "flush" });
      expect(worker.terminateCalls).toHaveLength(1);

      vi.runAllTimers();
      // 「取りこぼすことがある」仕様なので、最終シグナルの配信有無は固定しない
      expect(received.length).toBeLessThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("terminate() が worker.terminate() を呼ぶ", () => {
    const { service, worker } = setup();
    service.terminate();

    expect(worker.terminateCalls).toHaveLength(1);
  });

  it("terminate() 後のメッセージで onSignal が呼ばれない", () => {
    const { service, worker } = setup();
    const received: SerialProtocolSignal[] = [];
    service.onSignal((s) => received.push(s));

    service.terminate();
    worker.simulateMessage({ type: "reset" });

    expect(received).toHaveLength(0);
  });

  it("worker.onerror が { kind: 'worker_error', event } として onError に渡る", () => {
    const { service, worker } = setup();
    const errors: BuzzerServiceError[] = [];
    service.onError((e) => errors.push(e));

    const errorEvent = new ErrorEvent("error", { message: "worker crash" });
    worker.simulateError(errorEvent);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({ kind: "worker_error", event: errorEvent });
  });

  it("worker.onmessageerror が { kind: 'message_error', event } として onError に渡る", () => {
    const { service, worker } = setup();
    const errors: BuzzerServiceError[] = [];
    service.onError((e) => errors.push(e));

    const msgErrorEvent = new MessageEvent("messageerror", { data: "bad" });
    worker.simulateMessageError(msgErrorEvent);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({ kind: "message_error", event: msgErrorEvent });
  });

  it("onSignal のクリーンアップ関数を呼ぶと購読が解除される", () => {
    const { service, worker } = setup();
    const received: SerialProtocolSignal[] = [];
    const cleanup = service.onSignal((s) => received.push(s));

    cleanup();
    worker.simulateMessage({ type: "reset" });

    expect(received).toHaveLength(0);
  });

  it("terminate() 後の processChunk は Worker に postMessage しない", () => {
    const { service, worker } = setup();
    service.terminate();
    service.processChunk(encoder.encode("2\r\n"));

    expect(worker.sentMessages).toHaveLength(0);
  });

  it("workerFactory を指定するとそれで Worker を生成する", () => {
    const customWorker = new FakeWorker();
    const factory = vi.fn(() => customWorker as unknown as Worker);
    const service = createBuzzerService(factory);

    service.processChunk(encoder.encode("2\r\n"));

    expect(factory).toHaveBeenCalledTimes(1);
    expect(customWorker.sentMessages).toHaveLength(1);
  });

  it("vi.stubGlobal('Worker', ...) でコンストラクタを差し替えると workerFactory 省略時に使われる", () => {
    const stubWorker = new FakeWorker();
    // class 構文で Worker を stub（アロー関数では new できないため正規関数を使う）
    vi.stubGlobal("Worker", function WorkerStub(this: unknown) {
      return stubWorker;
    });

    const service = createBuzzerService();
    service.processChunk(encoder.encode("2\r\n"));

    expect(stubWorker.sentMessages).toHaveLength(1);
  });
});

import type { SerialProtocolSignal } from "./serial_protocol";
import type { WorkerIncomingMessage, WorkerOutgoingMessage } from "./buzzer_worker";

/** Worker エラー通知の型 */
export type BuzzerServiceError =
  | { kind: "worker_error"; event: ErrorEvent }
  | { kind: "message_error"; event: MessageEvent };

export type BuzzerService = {
  /** バイト列チャンクを Worker に送る */
  processChunk(chunk: Uint8Array): void;
  /** 残留バッファの処理を Worker に依頼する（同期・取りこぼし許容） */
  flush(): void;
  /** シグナル受信ハンドラを登録する。戻り値は解除関数 */
  onSignal(handler: (signal: SerialProtocolSignal) => void): () => void;
  /** エラー受信ハンドラを登録する。戻り値は解除関数 */
  onError(handler: (error: BuzzerServiceError) => void): () => void;
  /** Worker を即時終了し、以降のハンドラ呼び出しを抑制する */
  terminate(): void;
};

/**
 * BuzzerService のインスタンスを生成する。
 * workerFactory が省略された場合はデフォルトの Worker を生成する。
 */
export function createBuzzerService(workerFactory?: () => Worker): BuzzerService {
  // workerFactory が指定されていない場合は vi.stubGlobal("Worker", ...) で注入可能な
  // グローバル Worker コンストラクタを使用する
  const worker: Worker =
    workerFactory !== undefined
      ? workerFactory()
      : new Worker(new URL("./buzzer_worker.ts", import.meta.url), { type: "module" });

  let terminated = false;
  const signalHandlers = new Set<(signal: SerialProtocolSignal) => void>();
  const errorHandlers = new Set<(error: BuzzerServiceError) => void>();

  worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
    if (terminated) return;
    const signal = event.data;
    for (const handler of signalHandlers) {
      handler(signal);
    }
  };

  worker.onerror = (event: ErrorEvent) => {
    if (terminated) return;
    const error: BuzzerServiceError = { kind: "worker_error", event };
    for (const handler of errorHandlers) {
      handler(error);
    }
  };

  worker.onmessageerror = (event: MessageEvent) => {
    if (terminated) return;
    const error: BuzzerServiceError = { kind: "message_error", event };
    for (const handler of errorHandlers) {
      handler(error);
    }
  };

  return {
    processChunk(chunk: Uint8Array): void {
      if (terminated) return;
      const msg: WorkerIncomingMessage = { type: "chunk", data: chunk };
      worker.postMessage(msg);
    },

    flush(): void {
      if (terminated) return;
      const msg: WorkerIncomingMessage = { type: "flush" };
      worker.postMessage(msg);
    },

    onSignal(handler: (signal: SerialProtocolSignal) => void): () => void {
      signalHandlers.add(handler);
      return () => {
        signalHandlers.delete(handler);
      };
    },

    onError(handler: (error: BuzzerServiceError) => void): () => void {
      errorHandlers.add(handler);
      return () => {
        errorHandlers.delete(handler);
      };
    },

    terminate(): void {
      terminated = true;
      signalHandlers.clear();
      errorHandlers.clear();
      worker.terminate();
    },
  };
}

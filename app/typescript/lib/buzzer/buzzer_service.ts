/**
 * BuzzerDecoder をインラインで保持し、シグナルの同期ディスパッチを担うサービス。
 * createBuzzerService() で生成する。
 */
import { BuzzerDecoder } from "./buzzer_decoder";
import type { SerialProtocolSignal } from "./serial_protocol";

export type BuzzerService = {
  /** バイト列チャンクを処理しシグナルをハンドラに同期ディスパッチする */
  processChunk(chunk: Uint8Array): void;
  /** 残留バッファを強制処理してシグナルをディスパッチする（切断時に呼ぶ） */
  flush(): void;
  /** シグナル受信ハンドラを登録する。戻り値は解除関数 */
  onSignal(handler: (signal: SerialProtocolSignal) => void): () => void;
  /** サービスを終了し、以降のハンドラ呼び出しを抑制する */
  terminate(): void;
};

export function createBuzzerService(): BuzzerService {
  const decoder = new BuzzerDecoder();
  let terminated = false;
  const signalHandlers = new Set<(signal: SerialProtocolSignal) => void>();

  function dispatch(signals: SerialProtocolSignal[]): void {
    for (const signal of signals) {
      for (const handler of signalHandlers) {
        handler(signal);
      }
    }
  }

  return {
    processChunk(chunk: Uint8Array): void {
      if (terminated) return;
      dispatch(decoder.processChunk(chunk));
    },

    flush(): void {
      if (terminated) return;
      dispatch(decoder.flush());
    },

    onSignal(handler: (signal: SerialProtocolSignal) => void): () => void {
      signalHandlers.add(handler);
      return () => {
        signalHandlers.delete(handler);
      };
    },

    terminate(): void {
      terminated = true;
      signalHandlers.clear();
    },
  };
}

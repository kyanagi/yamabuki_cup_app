import { BuzzerDecoder } from "./buzzer_decoder";
import type { SerialProtocolSignal } from "./serial_protocol";

/** メインスレッド → Worker へのメッセージ型 */
export type WorkerIncomingMessage = { type: "chunk"; data: Uint8Array } | { type: "flush" };

/** Worker → メインスレッドへのメッセージ型 */
export type WorkerOutgoingMessage = SerialProtocolSignal;

const decoder = new BuzzerDecoder();

// DOM lib では DedicatedWorkerGlobalScope が未定義のため、インライン型でキャストする
const typedPostMessage = (data: WorkerOutgoingMessage): void => {
  (self as unknown as { postMessage(data: WorkerOutgoingMessage): void }).postMessage(data);
};

self.onmessage = (event: MessageEvent<WorkerIncomingMessage>) => {
  const msg = event.data;
  if (msg.type === "chunk") {
    const signals = decoder.processChunk(msg.data);
    for (const signal of signals) {
      typedPostMessage(signal);
    }
  } else if (msg.type === "flush") {
    const signals = decoder.flush();
    for (const signal of signals) {
      typedPostMessage(signal);
    }
  }
};

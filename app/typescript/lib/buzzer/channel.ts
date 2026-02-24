import type { BuzzerSignal } from "./signal";

export const BUZZER_CHANNEL_NAME = "buzzer";

export type BuzzerChannel = {
  post: (signal: BuzzerSignal) => void;
  onMessage: (handler: (signal: BuzzerSignal) => void) => void;
  close: () => void;
};

export function createBuzzerChannel(
  channel: BroadcastChannel = new BroadcastChannel(BUZZER_CHANNEL_NAME),
): BuzzerChannel {
  return {
    post(signal: BuzzerSignal): void {
      channel.postMessage(signal);
    },

    onMessage(handler: (signal: BuzzerSignal) => void): void {
      channel.onmessage = (event: MessageEvent<BuzzerSignal>) => {
        handler(event.data);
      };
    },

    close(): void {
      channel.close();
    },
  };
}

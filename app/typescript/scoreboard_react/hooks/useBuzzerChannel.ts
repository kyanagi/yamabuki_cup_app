import { useEffect, useState } from "react";
import { createBuzzerChannel } from "../../lib/buzzer/channel";
import { isSeatId, type SeatId } from "../../lib/buzzer/seat_id";
import type { BuzzerSignal } from "../../lib/buzzer/signal";
import type { MatchState } from "../types";

export function useBuzzerChannel(matchState: MatchState | null): SeatId | null {
  const [pressedSeat, setPressedSeat] = useState<SeatId | null>(null);

  // matchState が変わるたびにクリア（Turbo Stream 更新時のクリアに相当）
  useEffect(() => {
    setPressedSeat(null);
  }, [matchState]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = createBuzzerChannel();

    channel.onMessage((signal: BuzzerSignal) => {
      switch (signal.type) {
        case "button_pressed": {
          const { seat } = signal;
          if (!isSeatId(seat)) return;
          setPressedSeat(seat);
          break;
        }
        case "reset":
          setPressedSeat(null);
          break;
        default:
          break;
      }
    });

    return () => {
      channel.close();
    };
  }, []);

  return pressedSeat;
}

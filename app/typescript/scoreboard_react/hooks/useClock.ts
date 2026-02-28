/**
 * 現在時刻（時・分）とコロン点滅状態を 1 秒ごとに返すフック。
 * アナウンスシーンの時計表示で使用する。
 */
import { useState, useEffect } from "react";

export type ClockState = {
  hours: string;
  minutes: string;
  colonVisible: boolean;
};

export function useClock(): ClockState {
  function getCurrentState(): ClockState {
    const now = new Date();
    return {
      hours: now.getHours().toString().padStart(2, "0"),
      minutes: now.getMinutes().toString().padStart(2, "0"),
      // 偶数秒はコロン表示、奇数秒は非表示
      colonVisible: now.getSeconds() % 2 === 0,
    };
  }

  const [state, setState] = useState<ClockState>(getCurrentState);

  useEffect(() => {
    const timerId = setInterval(() => {
      setState(getCurrentState());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return state;
}

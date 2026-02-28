/**
 * タイマーコマンド（set / start / stop）を受け取り、残り時間 (remainingMs) を管理するフック。
 * - set: 残り時間をセットして停止状態にする
 * - start: 100ms 間隔でカウントダウンを開始し、0 到達時に自動停止
 * - stop: カウントダウンを停止し、残り時間を確定する
 */
import { useEffect, useRef, useState } from "react";
import type { TimerCommand } from "../types";

export type TimerState = {
  remainingMs: number | null;
};

export function useTimer(command: TimerCommand | null): TimerState {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingOnStartRef = useRef<number>(0);
  const timerIdRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (command === null) return;

    switch (command.type) {
      case "set": {
        if (timerIdRef.current !== undefined) {
          clearInterval(timerIdRef.current);
          timerIdRef.current = undefined;
        }
        remainingOnStartRef.current = command.remainingTimeMs;
        setRemainingMs(command.remainingTimeMs);
        break;
      }
      case "start": {
        if (timerIdRef.current !== undefined) return;
        startTimeRef.current = Date.now();
        timerIdRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          const remaining = Math.max(0, remainingOnStartRef.current - elapsed);
          setRemainingMs(remaining);
          if (remaining <= 0) {
            clearInterval(timerIdRef.current);
            timerIdRef.current = undefined;
            remainingOnStartRef.current = 0;
          }
        }, 100);
        break;
      }
      case "stop": {
        if (timerIdRef.current !== undefined) {
          clearInterval(timerIdRef.current);
          timerIdRef.current = undefined;
          const elapsed = Date.now() - startTimeRef.current;
          remainingOnStartRef.current = Math.max(0, remainingOnStartRef.current - elapsed);
          setRemainingMs(remainingOnStartRef.current);
        }
        break;
      }
    }
  }, [command]);

  useEffect(() => {
    return () => {
      if (timerIdRef.current !== undefined) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);

  return { remainingMs };
}

import React from "react";
import type { TimerCommand } from "../types";
import { useTimer } from "../hooks/useTimer";

type Props = {
  timerCommand: TimerCommand | null;
};

function formatTime(ms: number | null): string {
  if (ms === null) return "--:--";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerScene({ timerCommand }: Props): React.JSX.Element {
  const { remainingMs } = useTimer(timerCommand);

  return <div id="timer">{formatTime(remainingMs)}</div>;
}

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTimer } from "../hooks/useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("command が null のとき remainingMs は null", () => {
    const { result } = renderHook(() => useTimer(null));
    expect(result.current.remainingMs).toBeNull();
  });

  it("set コマンドで remainingMs がセットされる", () => {
    const { result, rerender } = renderHook(({ command }) => useTimer(command), {
      initialProps: { command: null as Parameters<typeof useTimer>[0] },
    });

    act(() => {
      rerender({ command: { type: "set", remainingTimeMs: 60000 } });
    });

    expect(result.current.remainingMs).toBe(60000);
  });

  it("start コマンドでタイマーが動き始める", () => {
    const { result, rerender } = renderHook(({ command }) => useTimer(command), {
      initialProps: { command: null as Parameters<typeof useTimer>[0] },
    });

    act(() => {
      rerender({ command: { type: "set", remainingTimeMs: 60000 } });
    });

    act(() => {
      rerender({ command: { type: "start" } });
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // 5秒経過で残り55秒近辺（タイミングによって微差あるので範囲チェック）
    expect(result.current.remainingMs).toBeGreaterThan(54000);
    expect(result.current.remainingMs).toBeLessThanOrEqual(55100);
  });

  it("stop コマンドでタイマーが止まる", () => {
    const { result, rerender } = renderHook(({ command }) => useTimer(command), {
      initialProps: { command: null as Parameters<typeof useTimer>[0] },
    });

    act(() => {
      rerender({ command: { type: "set", remainingTimeMs: 60000 } });
    });

    act(() => {
      rerender({ command: { type: "start" } });
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    act(() => {
      rerender({ command: { type: "stop" } });
    });

    const afterStop = result.current.remainingMs ?? 0;

    // stopコマンド後は remainingMs が更新されている
    expect(afterStop).toBeLessThan(60000);

    // さらに時間が経過しても remainingMs は変化しない
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.remainingMs).toBe(afterStop);
  });

  it("残り時間がゼロ以下になるとタイマーが自動停止する", () => {
    const { result, rerender } = renderHook(({ command }) => useTimer(command), {
      initialProps: { command: null as Parameters<typeof useTimer>[0] },
    });

    act(() => {
      rerender({ command: { type: "set", remainingTimeMs: 1000 } });
    });

    act(() => {
      rerender({ command: { type: "start" } });
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.remainingMs).toBe(0);
  });

  it("自動停止後に start を再送しても 00:00 のまま維持される", () => {
    const { result, rerender } = renderHook(({ command }) => useTimer(command), {
      initialProps: { command: null as Parameters<typeof useTimer>[0] },
    });

    act(() => {
      rerender({ command: { type: "set", remainingTimeMs: 1000 } });
    });

    act(() => {
      rerender({ command: { type: "start" } });
    });

    // タイマーを時間切れにする
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.remainingMs).toBe(0);

    // 自動停止後に start を再送（誤操作を想定）
    act(() => {
      rerender({ command: { type: "start" } });
    });

    // 500ms 経過 — バグがあれば remainingOnStartRef=1000 なので 500ms になる
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 0 のまま維持される（巻き戻らない）
    expect(result.current.remainingMs).toBe(0);
  });
});

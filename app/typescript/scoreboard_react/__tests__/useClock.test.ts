import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useClock } from "../hooks/useClock";

describe("useClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期値として現在時刻の時と分を返す", () => {
    // 特定時刻に固定（2026-01-01 13:45:00）
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 0));

    const { result } = renderHook(() => useClock());

    expect(result.current.hours).toBe("13");
    expect(result.current.minutes).toBe("45");
  });

  it("時・分が2桁ゼロパディングされる", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 9, 5, 0));

    const { result } = renderHook(() => useClock());

    expect(result.current.hours).toBe("09");
    expect(result.current.minutes).toBe("05");
  });

  it("偶数秒のとき colonVisible は true", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 0)); // 秒=0（偶数）

    const { result } = renderHook(() => useClock());

    expect(result.current.colonVisible).toBe(true);
  });

  it("奇数秒のとき colonVisible は false", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 1)); // 秒=1（奇数）

    const { result } = renderHook(() => useClock());

    expect(result.current.colonVisible).toBe(false);
  });

  it("1秒経過後に colonVisible が切り替わる", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 0)); // 秒=0（偶数→true）

    const { result } = renderHook(() => useClock());
    expect(result.current.colonVisible).toBe(true);

    // advanceTimersByTime だけで時刻を進める（setSystemTime との二重設定を避ける）
    act(() => {
      vi.advanceTimersByTime(1000); // 秒=1（奇数→false）
    });

    expect(result.current.colonVisible).toBe(false);
  });

  it("1分経過後に minutes が更新される", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 0));

    const { result } = renderHook(() => useClock());
    expect(result.current.minutes).toBe("45");

    // advanceTimersByTime だけで時刻を進める（setSystemTime との二重設定を避ける）
    act(() => {
      vi.advanceTimersByTime(60000); // 13:46:00 になる
    });

    expect(result.current.minutes).toBe("46");
  });
});

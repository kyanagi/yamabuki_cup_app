import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TimerScene } from "../components/TimerScene";

describe("TimerScene", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("#timer 要素を持つ", () => {
    const { container } = render(<TimerScene timerCommand={null} />);
    expect(container.querySelector("#timer")).toBeTruthy();
  });

  it("timerCommand が null のとき '--:--' を表示する", () => {
    const { container } = render(<TimerScene timerCommand={null} />);
    expect(container.querySelector("#timer")?.textContent).toBe("--:--");
  });

  it("set コマンド後に残り時間を MM:SS 形式で表示する", () => {
    const { container, rerender } = render(<TimerScene timerCommand={null} />);

    rerender(<TimerScene timerCommand={{ type: "set", remainingTimeMs: 90000 }} />);

    expect(container.querySelector("#timer")?.textContent).toBe("01:30");
  });

  it("残り時間がゼロのとき '00:00' を表示する", () => {
    const { container, rerender } = render(<TimerScene timerCommand={null} />);

    rerender(<TimerScene timerCommand={{ type: "set", remainingTimeMs: 0 }} />);

    expect(container.querySelector("#timer")?.textContent).toBe("00:00");
  });
});

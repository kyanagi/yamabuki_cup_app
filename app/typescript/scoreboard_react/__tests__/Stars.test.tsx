import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { Stars } from "../components/shared/Stars";

afterEach(() => {
  vi.useRealTimers();
});

describe("Stars", () => {
  it("stars が 3 のとき、3つの span が表示される", () => {
    const { container } = render(<Stars stars={3} />);
    const spans = container.querySelectorAll(".final-player__star");
    expect(spans).toHaveLength(3);
    for (const span of spans) {
      expect(span.textContent).toBe("★");
    }
  });

  it("stars が 0 のとき、span が表示されない", () => {
    const { container } = render(<Stars stars={0} />);
    expect(container.querySelectorAll(".final-player__star")).toHaveLength(0);
  });

  it("初期表示では pop クラスが付かない", () => {
    const { container } = render(<Stars stars={3} />);
    expect(container.querySelectorAll(".final-player__star--pop")).toHaveLength(0);
  });

  it("stars が増えたとき、追加された★に pop クラスが付く", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Stars stars={2} />);
    act(() => rerender(<Stars stars={3} />));

    const spans = container.querySelectorAll(".final-player__star");
    expect(spans).toHaveLength(3);
    // 左端（インデックス0）にアニメーションが付く
    expect(spans[0]?.classList.contains("final-player__star--pop")).toBe(true);
    // 他の★には付かない
    expect(spans[1]?.classList.contains("final-player__star--pop")).toBe(false);
    expect(spans[2]?.classList.contains("final-player__star--pop")).toBe(false);
  });

  it("pop クラスは 600ms 後に外れる", async () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Stars stars={2} />);
    act(() => rerender(<Stars stars={3} />));

    expect(container.querySelectorAll(".final-player__star--pop")).toHaveLength(1);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(container.querySelectorAll(".final-player__star--pop")).toHaveLength(0);
  });
});

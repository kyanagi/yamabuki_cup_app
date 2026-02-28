import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnnouncementScene } from "../components/AnnouncementScene";

describe("AnnouncementScene", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 0)); // 13:45:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("アナウンステキストを表示する", () => {
    render(<AnnouncementScene scene={{ type: "announcement", text: "テストアナウンス" }} />);
    expect(screen.getByText("テストアナウンス")).toBeTruthy();
  });

  it("現在時刻の時と分を表示する", () => {
    render(<AnnouncementScene scene={{ type: "announcement", text: "テスト" }} />);
    const clockEl = document.querySelector(".announcement-clock");
    expect(clockEl?.textContent).toContain("13");
    expect(clockEl?.textContent).toContain("45");
  });

  it("偶数秒のとき コロンに hidden クラスがつかない", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 0)); // 秒=0（偶数）
    render(<AnnouncementScene scene={{ type: "announcement", text: "テスト" }} />);
    const colon = document.querySelector(".announcement-clock span");
    expect(colon?.className).not.toContain("announcement-clock__colon--hidden");
  });

  it("奇数秒のとき コロンに hidden クラスがつく", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 13, 45, 1)); // 秒=1（奇数）
    render(<AnnouncementScene scene={{ type: "announcement", text: "テスト" }} />);
    const colon = document.querySelector(".announcement-clock span");
    expect(colon?.className).toContain("announcement-clock__colon--hidden");
  });

  it("テキストの改行が br 要素として描画される", () => {
    const { container } = render(<AnnouncementScene scene={{ type: "announcement", text: "1行目\n2行目" }} />);
    expect(container.querySelector("br")).toBeTruthy();
    // announcement-text の textContent に両行が含まれる
    const textEl = container.querySelector(".announcement-text");
    expect(textEl?.textContent).toContain("1行目");
    expect(textEl?.textContent).toContain("2行目");
  });

  it(".announcement-container クラスを持つ", () => {
    const { container } = render(<AnnouncementScene scene={{ type: "announcement", text: "テスト" }} />);
    expect(container.querySelector(".announcement-container")).toBeTruthy();
  });

  it(".announcement-clock クラスを持つ", () => {
    const { container } = render(<AnnouncementScene scene={{ type: "announcement", text: "テスト" }} />);
    expect(container.querySelector(".announcement-clock")).toBeTruthy();
  });
});

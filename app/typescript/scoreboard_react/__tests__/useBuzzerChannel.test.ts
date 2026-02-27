import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBuzzerChannel } from "../hooks/useBuzzerChannel";
import type { MatchState } from "../types";

const MATCH_STATE_A: MatchState = {
  matchId: 1,
  ruleTemplate: "hayaoshi",
  gridClass: "match-scorelist-column1",
  footerLabel: "準々決勝",
  scoreOperationId: 1,
  scores: [],
};

const MATCH_STATE_B: MatchState = {
  matchId: 1,
  ruleTemplate: "hayaoshi",
  gridClass: "match-scorelist-column1",
  footerLabel: "準々決勝",
  scoreOperationId: 2,
  scores: [],
};

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;
  static instances: MockBroadcastChannel[] = [];

  constructor(_name: string) {
    MockBroadcastChannel.instances.push(this);
  }

  close() {}

  postMessage(_data: unknown) {}

  simulateMessage(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe("useBuzzerChannel", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  it("初期状態では pressedSeat は null", () => {
    const { result } = renderHook(() => useBuzzerChannel(null));
    expect(result.current).toBeNull();
  });

  it("button_pressed シグナルで該当席がハイライトされる", () => {
    const { result } = renderHook(() => useBuzzerChannel(MATCH_STATE_A));
    const channel = MockBroadcastChannel.instances[0];

    act(() => {
      channel?.simulateMessage({ type: "button_pressed", seat: 3 });
    });

    expect(result.current).toBe(3);
  });

  it("reset シグナルで pressedSeat がクリアされる", () => {
    const { result } = renderHook(() => useBuzzerChannel(MATCH_STATE_A));
    const channel = MockBroadcastChannel.instances[0];

    act(() => {
      channel?.simulateMessage({ type: "button_pressed", seat: 3 });
    });

    act(() => {
      channel?.simulateMessage({ type: "reset" });
    });

    expect(result.current).toBeNull();
  });

  it("matchState が変化すると pressedSeat がクリアされる", () => {
    const { result, rerender } = renderHook(
      ({ matchState }: { matchState: MatchState | null }) => useBuzzerChannel(matchState),
      { initialProps: { matchState: MATCH_STATE_A } },
    );
    const channel = MockBroadcastChannel.instances[0];

    act(() => {
      channel?.simulateMessage({ type: "button_pressed", seat: 5 });
    });
    expect(result.current).toBe(5);

    act(() => {
      rerender({ matchState: MATCH_STATE_B });
    });

    expect(result.current).toBeNull();
  });

  it("無効な seat は無視される", () => {
    const { result } = renderHook(() => useBuzzerChannel(MATCH_STATE_A));
    const channel = MockBroadcastChannel.instances[0];

    act(() => {
      channel?.simulateMessage({ type: "button_pressed", seat: 999 });
    });

    expect(result.current).toBeNull();
  });
});

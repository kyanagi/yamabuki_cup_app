import { act } from "@testing-library/react";

type DispatchAnimationEndOptions = {
  animationName?: string;
};

// jsdom のバージョン差分で React が購読するイベント名が変わるため、
// animationend / webkitAnimationEnd の両方を送出してテストを安定化する
export function dispatchAnimationEnd(element: HTMLElement, options: DispatchAnimationEndOptions = {}): void {
  const { animationName } = options;

  act(() => {
    for (const eventType of ["animationend", "webkitAnimationEnd"] as const) {
      const event = new Event(eventType, { bubbles: true });
      if (animationName !== undefined) {
        Object.defineProperty(event, "animationName", { value: animationName });
      }
      element.dispatchEvent(event);
    }
  });
}

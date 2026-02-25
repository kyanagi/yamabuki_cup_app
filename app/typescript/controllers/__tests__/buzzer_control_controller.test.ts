import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import BuzzerControlController from "../buzzer_control_controller";

type BuzzerStateChangedDetail = {
  learningSeat: number | null;
  lastPressed: string;
  mapping: Record<string, number>;
};

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly postMessage: ReturnType<typeof vi.fn>;
  readonly close: ReturnType<typeof vi.fn>;

  constructor(_name: string) {
    this.postMessage = vi.fn();
    this.close = vi.fn();
    MockBroadcastChannel.instances.push(this);
  }
}

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function latestChannel(): MockBroadcastChannel {
  const channel = MockBroadcastChannel.instances.at(-1);
  if (!channel) {
    throw new Error("BroadcastChannel instance not found");
  }
  return channel;
}

function lastState(states: BuzzerStateChangedDetail[]): BuzzerStateChangedDetail {
  const state = states.at(-1);
  if (!state) throw new Error("state not found");
  return state;
}

describe("BuzzerControlController", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("接続時に初期状態を配信する", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "2": 1 }));
    const states: BuzzerStateChangedDetail[] = [];
    const handler = (event: Event) => {
      states.push((event as CustomEvent<BuzzerStateChangedDetail>).detail);
    };
    window.addEventListener("buzzer:state-changed", handler);

    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    expect(lastState(states)).toEqual({
      learningSeat: null,
      lastPressed: "未入力",
      mapping: { "2": 1 },
    });

    teardownControllerTest(application);
    window.removeEventListener("buzzer:state-changed", handler);
  });

  it("学習席トグルイベントで learningSeat を切り替える", async () => {
    const states: BuzzerStateChangedDetail[] = [];
    const handler = (event: Event) => {
      states.push((event as CustomEvent<BuzzerStateChangedDetail>).detail);
    };
    window.addEventListener("buzzer:state-changed", handler);

    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:assignment:toggle-learning", { detail: { seat: 0 } }));
    expect(lastState(states).learningSeat).toBe(0);

    window.dispatchEvent(new CustomEvent("buzzer:assignment:toggle-learning", { detail: { seat: 0 } }));
    expect(lastState(states).learningSeat).toBeNull();

    teardownControllerTest(application);
    window.removeEventListener("buzzer:state-changed", handler);
  });

  it("学習中のボタン押下は割り当てのみ行い broadcast しない", async () => {
    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:assignment:toggle-learning", { detail: { seat: 0 } }));
    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId: 2 } }));

    expect(localStorage.getItem("buzzerMapping")).toBe(JSON.stringify({ "2": 0 }));
    expect(latestChannel().postMessage).not.toHaveBeenCalled();

    teardownControllerTest(application);
  });

  it("通常時の押下は割り当て済み seat を button_pressed で送信する", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "2": 1 }));

    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId: 2 } }));

    expect(latestChannel().postMessage).toHaveBeenCalledWith({
      type: "button_pressed",
      seat: 1,
    });

    teardownControllerTest(application);
  });

  it("未割り当てボタン押下時は送信しない", async () => {
    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId: 1 } }));

    expect(latestChannel().postMessage).not.toHaveBeenCalled();

    teardownControllerTest(application);
  });

  it("reset イベントで reset を送信し state を初期化する", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "2": 1 }));
    const states: BuzzerStateChangedDetail[] = [];
    const handler = (event: Event) => {
      states.push((event as CustomEvent<BuzzerStateChangedDetail>).detail);
    };
    window.addEventListener("buzzer:state-changed", handler);

    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:assignment:toggle-learning", { detail: { seat: 0 } }));
    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId: 2 } }));
    window.dispatchEvent(new CustomEvent("buzzer:emulator:reset"));

    expect(lastState(states)).toEqual({
      learningSeat: null,
      lastPressed: "未入力",
      mapping: { "2": 0 },
    });
    expect(latestChannel().postMessage).toHaveBeenCalledWith({ type: "reset" });

    teardownControllerTest(application);
    window.removeEventListener("buzzer:state-changed", handler);
  });

  it("serial correct イベントで correct を送信する", async () => {
    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:serial:correct"));

    expect(latestChannel().postMessage).toHaveBeenCalledWith({ type: "correct" });

    teardownControllerTest(application);
  });

  it("serial wrong イベントで wrong を送信する", async () => {
    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:serial:wrong"));

    expect(latestChannel().postMessage).toHaveBeenCalledWith({ type: "wrong" });

    teardownControllerTest(application);
  });

  it("全消去イベントで割り当てを削除する", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "1": 0, "2": 1 }));

    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:assignment:clear"));

    expect(localStorage.getItem("buzzerMapping")).toBeNull();

    teardownControllerTest(application);
  });

  it("同じ席へ別ボタンを割り当てると古い割り当てが外れる", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "1": 0 }));

    const { application } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      '<div data-controller="buzzer-control"></div>',
      "buzzer-control",
    );

    window.dispatchEvent(new CustomEvent("buzzer:assignment:toggle-learning", { detail: { seat: 0 } }));
    window.dispatchEvent(new CustomEvent("buzzer:emulator:button-press", { detail: { buttonId: 2 } }));

    expect(localStorage.getItem("buzzerMapping")).toBe(JSON.stringify({ "2": 0 }));

    teardownControllerTest(application);
  });
});

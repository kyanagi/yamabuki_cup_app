import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import BuzzerControlController from "../buzzer_control_controller";

type MockMessage = unknown;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  readonly postMessage: ReturnType<typeof vi.fn>;
  readonly close: ReturnType<typeof vi.fn>;

  constructor(name: string) {
    this.name = name;
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

function createHTML(): string {
  return `
    <div data-controller="buzzer-control">
      <p data-buzzer-control-target="lastPressed">未入力</p>
      <table>
        <tbody>
          <tr data-buzzer-control-seat-row data-seat="0">
            <td>席0</td>
            <td data-buzzer-control-role="assignment">未割当</td>
            <td>
              <button
                type="button"
                data-seat="0"
                data-action="click->buzzer-control#startLearningSeat"
                data-buzzer-control-role="learnButton"
              >
                設定
              </button>
            </td>
          </tr>
          <tr data-buzzer-control-seat-row data-seat="1">
            <td>席1</td>
            <td data-buzzer-control-role="assignment">未割当</td>
            <td>
              <button
                type="button"
                data-seat="1"
                data-action="click->buzzer-control#startLearningSeat"
                data-buzzer-control-role="learnButton"
              >
                設定
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        class="button"
        data-button-id="1"
        data-action="click->buzzer-control#pressEmulatorButton"
      >
        1
      </button>
      <button
        type="button"
        class="button"
        data-button-id="2"
        data-action="click->buzzer-control#pressEmulatorButton"
      >
        2
      </button>
      <button
        type="button"
        data-action="click->buzzer-control#resetFromEmulator"
      >
        reset
      </button>
      <button
        type="button"
        data-action="click->buzzer-control#clearAllMappings"
      >
        全消去
      </button>
    </div>
  `;
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

  function latestChannel(): MockBroadcastChannel {
    const channel = MockBroadcastChannel.instances.at(-1);
    if (!channel) {
      throw new Error("BroadcastChannel instance not found");
    }
    return channel;
  }

  it("エミュレータボタン押下で最終押下表示が更新される", async () => {
    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const lastPressed = element.querySelector('[data-buzzer-control-target="lastPressed"]');
    const button2 = element.querySelector('[data-button-id="2"]');
    if (!lastPressed || !button2) throw new Error("required element not found");

    button2.dispatchEvent(new Event("click"));

    expect(lastPressed.textContent).toBe("2");

    teardownControllerTest(application);
  });

  it("待受中のボタン押下は割り当てのみ行い broadcast しない", async () => {
    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const learnButton = element.querySelector('[data-action="click->buzzer-control#startLearningSeat"]');
    const button2 = element.querySelector('[data-button-id="2"]');
    if (!learnButton || !button2) throw new Error("required element not found");

    learnButton.dispatchEvent(new Event("click"));
    button2.dispatchEvent(new Event("click"));

    const mapping = localStorage.getItem("buzzerMapping");
    expect(mapping).not.toBeNull();
    expect(mapping && JSON.parse(mapping)).toEqual({ "2": 0 });
    expect(latestChannel().postMessage).not.toHaveBeenCalled();

    teardownControllerTest(application);
  });

  it("通常時の押下は割り当て済み seat を button_pressed で送信する", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "2": 1 }));

    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const button2 = element.querySelector('[data-button-id="2"]');
    if (!button2) throw new Error("required element not found");

    button2.dispatchEvent(new Event("click"));

    expect(latestChannel().postMessage).toHaveBeenCalledWith({
      type: "button_pressed",
      seat: 1,
    } satisfies MockMessage);

    teardownControllerTest(application);
  });

  it("未割り当てボタン押下時は送信しない", async () => {
    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const button1 = element.querySelector('[data-button-id="1"]');
    if (!button1) throw new Error("required element not found");

    button1.dispatchEvent(new Event("click"));

    expect(latestChannel().postMessage).not.toHaveBeenCalled();

    teardownControllerTest(application);
  });

  it("reset 操作で最終押下表示が初期化される", async () => {
    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const lastPressed = element.querySelector('[data-buzzer-control-target="lastPressed"]');
    const button1 = element.querySelector('[data-button-id="1"]');
    const resetButton = element.querySelector('[data-action="click->buzzer-control#resetFromEmulator"]');
    if (!lastPressed || !button1 || !resetButton) throw new Error("required element not found");

    button1.dispatchEvent(new Event("click"));
    resetButton.dispatchEvent(new Event("click"));

    expect(lastPressed.textContent).toBe("未入力");
    expect(latestChannel().postMessage).toHaveBeenCalledWith({
      type: "reset",
    } satisfies MockMessage);

    teardownControllerTest(application);
  });

  it("全消去で割り当てが削除される", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "1": 0, "2": 1 }));

    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const clearButton = element.querySelector('[data-action="click->buzzer-control#clearAllMappings"]');
    if (!clearButton) throw new Error("required element not found");

    clearButton.dispatchEvent(new Event("click"));

    expect(localStorage.getItem("buzzerMapping")).toBeNull();

    teardownControllerTest(application);
  });

  it("同じ席へ別ボタンを割り当てると古い割り当てが外れる", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "1": 0 }));

    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const learnButton = element.querySelector('[data-action="click->buzzer-control#startLearningSeat"]');
    const button2 = element.querySelector('[data-button-id="2"]');
    if (!learnButton || !button2) throw new Error("required element not found");

    learnButton.dispatchEvent(new Event("click"));
    button2.dispatchEvent(new Event("click"));

    const mapping = localStorage.getItem("buzzerMapping");
    expect(mapping && JSON.parse(mapping)).toEqual({ "2": 0 });

    teardownControllerTest(application);
  });

  it("保存済み割り当てを読み込んで表示する", async () => {
    localStorage.setItem("buzzerMapping", JSON.stringify({ "2": 1 }));

    const { application, element } = await setupControllerTest<BuzzerControlController>(
      BuzzerControlController,
      createHTML(),
      "buzzer-control",
    );

    const row = element.querySelector('[data-buzzer-control-seat-row][data-seat="1"]');
    const assignment = row?.querySelector('[data-buzzer-control-role="assignment"]');
    if (!assignment) throw new Error("required element not found");

    expect(assignment.textContent).toBe("ボタン 2");

    teardownControllerTest(application);
  });
});

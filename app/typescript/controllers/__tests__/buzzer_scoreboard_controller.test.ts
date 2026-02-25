import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import BuzzerScoreboardController from "../buzzer_scoreboard_controller";

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly close: ReturnType<typeof vi.fn>;

  constructor(public readonly name: string) {
    this.close = vi.fn();
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(_message: unknown): void {}

  emit(message: unknown): void {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }
}

function latestChannel(): MockBroadcastChannel {
  const channel = MockBroadcastChannel.instances.at(-1);
  if (!channel) throw new Error("BroadcastChannel instance not found");
  return channel;
}

function createHTML(): string {
  return `
    <div id="match-scorelist" data-controller="buzzer-scoreboard">
      <div id="seat-0" data-seat="0">A</div>
      <div id="seat-1" data-seat="1">B</div>
    </div>
  `;
}

describe("BuzzerScoreboardController", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("button_pressed で該当 seat のみ点灯する", async () => {
    const { application } = await setupControllerTest<BuzzerScoreboardController>(
      BuzzerScoreboardController,
      createHTML(),
      "buzzer-scoreboard",
    );

    latestChannel().emit({ type: "button_pressed", seat: 1 });

    expect(document.getElementById("seat-0")?.classList.contains("player--buzzer-pressed")).toBe(false);
    expect(document.getElementById("seat-1")?.classList.contains("player--buzzer-pressed")).toBe(true);

    teardownControllerTest(application);
  });

  it("別 seat の button_pressed で点灯先が移動する", async () => {
    const { application } = await setupControllerTest<BuzzerScoreboardController>(
      BuzzerScoreboardController,
      createHTML(),
      "buzzer-scoreboard",
    );

    latestChannel().emit({ type: "button_pressed", seat: 1 });
    latestChannel().emit({ type: "button_pressed", seat: 0 });

    expect(document.getElementById("seat-0")?.classList.contains("player--buzzer-pressed")).toBe(true);
    expect(document.getElementById("seat-1")?.classList.contains("player--buzzer-pressed")).toBe(false);

    teardownControllerTest(application);
  });

  it("reset で点灯が解除される", async () => {
    const { application } = await setupControllerTest<BuzzerScoreboardController>(
      BuzzerScoreboardController,
      createHTML(),
      "buzzer-scoreboard",
    );

    latestChannel().emit({ type: "button_pressed", seat: 1 });
    latestChannel().emit({ type: "reset" });

    expect(document.getElementById("seat-0")?.classList.contains("player--buzzer-pressed")).toBe(false);
    expect(document.getElementById("seat-1")?.classList.contains("player--buzzer-pressed")).toBe(false);

    teardownControllerTest(application);
  });

  it("存在しない seat は無視する", async () => {
    const { application } = await setupControllerTest<BuzzerScoreboardController>(
      BuzzerScoreboardController,
      createHTML(),
      "buzzer-scoreboard",
    );

    latestChannel().emit({ type: "button_pressed", seat: 99 });

    expect(document.getElementById("seat-0")?.classList.contains("player--buzzer-pressed")).toBe(false);
    expect(document.getElementById("seat-1")?.classList.contains("player--buzzer-pressed")).toBe(false);

    teardownControllerTest(application);
  });

  it("不正な型の seat は無視する", async () => {
    const { application } = await setupControllerTest<BuzzerScoreboardController>(
      BuzzerScoreboardController,
      createHTML(),
      "buzzer-scoreboard",
    );

    latestChannel().emit({ type: "button_pressed", seat: "1" });

    expect(document.getElementById("seat-0")?.classList.contains("player--buzzer-pressed")).toBe(false);
    expect(document.getElementById("seat-1")?.classList.contains("player--buzzer-pressed")).toBe(false);

    teardownControllerTest(application);
  });

  it("match-scorelist 更新イベントで点灯状態をクリアする", async () => {
    const { application } = await setupControllerTest<BuzzerScoreboardController>(
      BuzzerScoreboardController,
      createHTML(),
      "buzzer-scoreboard",
    );

    latestChannel().emit({ type: "button_pressed", seat: 1 });
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("action", "update");
    streamElement.setAttribute("target", "match-scorelist");
    document.body.appendChild(streamElement);
    streamElement.dispatchEvent(
      new CustomEvent("turbo:before-stream-render", {
        bubbles: true,
        detail: { render: vi.fn() },
      }),
    );

    expect(document.getElementById("seat-0")?.classList.contains("player--buzzer-pressed")).toBe(false);
    expect(document.getElementById("seat-1")?.classList.contains("player--buzzer-pressed")).toBe(false);

    teardownControllerTest(application);
  });
});

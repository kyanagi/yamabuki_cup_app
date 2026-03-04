import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import { createSeatId } from "../../lib/buzzer/seat_id";
import type { BuzzerSignal } from "../../lib/buzzer/signal";
import MatchBuzzerController from "../match_buzzer_controller";

// BroadcastChannel のモック（正規関数で定義。アロー関数は new できないため不可）
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly postMessage = vi.fn();
  readonly close = vi.fn();

  constructor(_name: string) {
    MockBroadcastChannel.instances.push(this);
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.({ data });
  }
}

function latestChannel(): MockBroadcastChannel {
  const channel = MockBroadcastChannel.instances.at(-1);
  if (!channel) throw new Error("BroadcastChannel instance not found");
  return channel;
}

function buttonPressedSignal(seatNumber: number): BuzzerSignal {
  const seat = createSeatId(seatNumber);
  if (seat === null) throw new Error(`Invalid seat: ${seatNumber}`);
  return { type: "button_pressed", seat };
}

// 全モーダルが閉じた状態の HTML
function createHTML(switchChecked = false): string {
  return `
    <div data-controller="match-buzzer">
      <input
        type="checkbox"
        data-match-buzzer-target="switch"
        ${switchChecked ? "checked" : ""}
      >
      <table>
        <tr data-controller="modal" data-seat="0">
          <td><div class="modal"></div></td>
        </tr>
        <tr data-controller="modal" data-seat="1">
          <td><div class="modal"></div></td>
        </tr>
        <tr data-controller="modal" data-seat="2">
          <td><div class="modal"></div></td>
        </tr>
      </table>
    </div>
  `;
}

// 既に特定 seat のモーダルが開いている HTML
function createHTMLWithActiveModal(activeSeat: number): string {
  const rows = [0, 1, 2]
    .map(
      (seat) => `
        <tr data-controller="modal" data-seat="${seat}">
          <td><div class="modal${seat === activeSeat ? " is-active" : ""}"></div></td>
        </tr>
      `,
    )
    .join("");

  return `
    <div data-controller="match-buzzer">
      <input type="checkbox" data-match-buzzer-target="switch" checked>
      <table>${rows}</table>
    </div>
  `;
}

describe("MatchBuzzerController", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("BroadcastChannel 非対応環境でも connect() がエラーにならない", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("BroadcastChannel", undefined);

    const { application } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(),
      "match-buzzer",
    );

    expect(MockBroadcastChannel.instances).toHaveLength(0);

    teardownControllerTest(application);
  });

  it("スイッチがOFFのとき button_pressed シグナルを受け取っても何もしない", async () => {
    const { application, element } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(false),
      "match-buzzer",
    );

    latestChannel().simulateMessage(buttonPressedSignal(0));

    const modal = element.querySelector('[data-seat="0"] .modal');
    expect(modal?.classList.contains("is-active")).toBe(false);

    teardownControllerTest(application);
  });

  it("スイッチがONで対応する seat の行が存在するとき、その .modal に is-active が追加される", async () => {
    const { application, element } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(true),
      "match-buzzer",
    );

    latestChannel().simulateMessage(buttonPressedSignal(1));

    const modal = element.querySelector('[data-seat="1"] .modal');
    expect(modal?.classList.contains("is-active")).toBe(true);

    teardownControllerTest(application);
  });

  it("スイッチがONでも既に .modal.is-active が存在するときは何もしない", async () => {
    const { application, element } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTMLWithActiveModal(2),
      "match-buzzer",
    );

    // seat=2 が既に is-active。seat=1 にシグナルを送っても開かない
    latestChannel().simulateMessage(buttonPressedSignal(1));

    const modal = element.querySelector('[data-seat="1"] .modal');
    expect(modal?.classList.contains("is-active")).toBe(false);

    teardownControllerTest(application);
  });

  it("button_pressed 以外のシグナル（correct / wrong / reset）は無視する", async () => {
    const { application, element } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(true),
      "match-buzzer",
    );

    const signals: BuzzerSignal[] = [{ type: "correct" }, { type: "wrong" }, { type: "reset" }];
    for (const signal of signals) {
      latestChannel().simulateMessage(signal);
    }

    const modal0 = element.querySelector('[data-seat="0"] .modal');
    const modal1 = element.querySelector('[data-seat="1"] .modal');
    expect(modal0?.classList.contains("is-active")).toBe(false);
    expect(modal1?.classList.contains("is-active")).toBe(false);

    teardownControllerTest(application);
  });

  it("対応する [data-seat] がない seat でも例外が発生しない", async () => {
    const { application } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(true),
      "match-buzzer",
    );

    // seat=9 は HTML に存在しない
    expect(() => latestChannel().simulateMessage(buttonPressedSignal(9))).not.toThrow();

    teardownControllerTest(application);
  });

  it("スイッチが DOM に存在しないとき button_pressed シグナルを受け取っても何もしない（Round2Ura など）", async () => {
    const html = `
      <div data-controller="match-buzzer">
        <table>
          <tr data-controller="modal" data-seat="0">
            <td><div class="modal"></div></td>
          </tr>
        </table>
      </div>
    `;
    const { application, element } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      html,
      "match-buzzer",
    );

    expect(() => latestChannel().simulateMessage(buttonPressedSignal(0))).not.toThrow();
    const modal = element.querySelector('[data-seat="0"] .modal');
    expect(modal?.classList.contains("is-active")).toBe(false);

    teardownControllerTest(application);
  });

  it("disconnect() 時に BroadcastChannel が close される", async () => {
    const { application, controller } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(),
      "match-buzzer",
    );

    const channel = latestChannel();
    controller.disconnect();

    expect(channel.close).toHaveBeenCalledOnce();

    teardownControllerTest(application);
  });
});

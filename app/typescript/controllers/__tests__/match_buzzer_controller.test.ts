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

// 送信ボタン HTML（早押し機正誤連動用）
function sendButtonsHTML(): string {
  return `
    <button type="button" class="is-hidden" data-buzzer-result="correct" data-action="click->match-buzzer#submitBuzzerResult">正解を送信</button>
    <button type="button" class="is-hidden" data-buzzer-result="wrong" data-action="click->match-buzzer#submitBuzzerResult">誤答を送信</button>
    <button type="submit" data-buzzer-submit="correct">正解</button>
    <button type="submit" data-buzzer-submit="wrong">誤答</button>
  `;
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

// 送信ボタンを含む全モーダルが閉じた状態の HTML
function createHTMLWithSendButtons(switchChecked = true): string {
  return `
    <div data-controller="match-buzzer">
      <input type="checkbox" data-match-buzzer-target="switch" ${switchChecked ? "checked" : ""}>
      <table>
        <tr data-controller="modal" data-seat="0">
          <td><div class="modal">${sendButtonsHTML()}</div></td>
        </tr>
        <tr data-controller="modal" data-seat="1">
          <td><div class="modal">${sendButtonsHTML()}</div></td>
        </tr>
      </table>
    </div>
  `;
}

// 送信ボタンを含み、特定 seat のモーダルが開いている HTML
function createHTMLWithActiveModalAndSendButtons(activeSeat: number): string {
  const rows = [0, 1]
    .map(
      (seat) => `
        <tr data-controller="modal" data-seat="${seat}">
          <td><div class="modal${seat === activeSeat ? " is-active" : ""}">${sendButtonsHTML()}</div></td>
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

  it("reset シグナルは無視する（モーダルの is-active に影響しない）", async () => {
    const { application, element } = await setupControllerTest<MatchBuzzerController>(
      MatchBuzzerController,
      createHTML(true),
      "match-buzzer",
    );

    latestChannel().simulateMessage({ type: "reset" });

    const modal0 = element.querySelector('[data-seat="0"] .modal');
    const modal1 = element.querySelector('[data-seat="1"] .modal');
    expect(modal0?.classList.contains("is-active")).toBe(false);
    expect(modal1?.classList.contains("is-active")).toBe(false);

    teardownControllerTest(application);
  });

  describe("correct / wrong シグナルによる送信ボタン表示", () => {
    it("モーダル開放中に correct シグナルを受けると「正解を送信」が表示され「誤答を送信」は非表示のまま", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      latestChannel().simulateMessage({ type: "correct" });

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      expect(modal?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(false);
      expect(modal?.querySelector("[data-buzzer-result='wrong']")?.classList.contains("is-hidden")).toBe(true);

      teardownControllerTest(application);
    });

    it("モーダル開放中に wrong シグナルを受けると「誤答を送信」が表示され「正解を送信」は非表示のまま", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      latestChannel().simulateMessage({ type: "wrong" });

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      expect(modal?.querySelector("[data-buzzer-result='wrong']")?.classList.contains("is-hidden")).toBe(false);
      expect(modal?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(true);

      teardownControllerTest(application);
    });

    it("correct → wrong の順に受けると「誤答を送信」のみ表示される", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      latestChannel().simulateMessage({ type: "correct" });
      latestChannel().simulateMessage({ type: "wrong" });

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      expect(modal?.querySelector("[data-buzzer-result='wrong']")?.classList.contains("is-hidden")).toBe(false);
      expect(modal?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(true);

      teardownControllerTest(application);
    });

    it("wrong → correct の順に受けると「正解を送信」のみ表示される", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      latestChannel().simulateMessage({ type: "wrong" });
      latestChannel().simulateMessage({ type: "correct" });

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      expect(modal?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(false);
      expect(modal?.querySelector("[data-buzzer-result='wrong']")?.classList.contains("is-hidden")).toBe(true);

      teardownControllerTest(application);
    });

    it("モーダルが開いていない状態で correct シグナルを受けても送信ボタンは変化しない", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithSendButtons(true),
        "match-buzzer",
      );

      latestChannel().simulateMessage({ type: "correct" });

      for (const btn of element.querySelectorAll<HTMLElement>("[data-buzzer-result]")) {
        expect(btn.classList.contains("is-hidden")).toBe(true);
      }

      teardownControllerTest(application);
    });

    it("スイッチ OFF のとき correct シグナルを受けても送信ボタンは変化しない", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      // スイッチを OFF に
      const sw = element.querySelector<HTMLInputElement>("[data-match-buzzer-target='switch']");
      if (sw) sw.checked = false;

      latestChannel().simulateMessage({ type: "correct" });

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      expect(modal?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(true);

      teardownControllerTest(application);
    });
  });

  describe("resetBuzzerButtons", () => {
    it("button_pressed でモーダルを開くとき、開く前に送信ボタンがリセットされる", async () => {
      // seat=0 のモーダルが開いており、「正解を送信」が表示済みの状態から開始
      const html = createHTMLWithActiveModalAndSendButtons(0);
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        html,
        "match-buzzer",
      );

      // correct シグナルで「正解を送信」を表示させる
      latestChannel().simulateMessage({ type: "correct" });
      // モーダルを手動で閉じる
      element.querySelector('[data-seat="0"] .modal')?.classList.remove("is-active");

      // seat=1 の button_pressed シグナルで別モーダルを開く
      latestChannel().simulateMessage(buttonPressedSignal(1));

      // seat=0 の送信ボタンがリセットされている（seat=1 の新しいモーダルが開いた）
      const modal0 = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      expect(modal0?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(true);

      teardownControllerTest(application);
    });

    it("resetBuzzerButtons() を呼ぶと全送信ボタンが is-hidden になる", async () => {
      const { application, element, controller } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      // correct で「正解を送信」を表示
      latestChannel().simulateMessage({ type: "correct" });
      const modal = element.querySelector('[data-seat="0"] .modal');
      expect(modal?.querySelector("[data-buzzer-result='correct']")?.classList.contains("is-hidden")).toBe(false);

      // resetBuzzerButtons() を呼ぶ
      controller.resetBuzzerButtons();

      for (const btn of element.querySelectorAll<HTMLElement>("[data-buzzer-result]")) {
        expect(btn.classList.contains("is-hidden")).toBe(true);
      }

      teardownControllerTest(application);
    });
  });

  describe("submitBuzzerResult", () => {
    it("「正解を送信」ボタンをクリックすると対応する submit ボタンがクリックされる", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      const correctSubmit = modal?.querySelector<HTMLButtonElement>("[data-buzzer-submit='correct']");
      const clicked = vi.fn();
      correctSubmit?.addEventListener("click", clicked);

      const sendButton = modal?.querySelector<HTMLButtonElement>("[data-buzzer-result='correct']");
      sendButton?.click();

      expect(clicked).toHaveBeenCalledOnce();

      teardownControllerTest(application);
    });

    it("「誤答を送信」ボタンをクリックすると対応する submit ボタンがクリックされる", async () => {
      const { application, element } = await setupControllerTest<MatchBuzzerController>(
        MatchBuzzerController,
        createHTMLWithActiveModalAndSendButtons(0),
        "match-buzzer",
      );

      const modal = element.querySelector<HTMLElement>('[data-seat="0"] .modal');
      const wrongSubmit = modal?.querySelector<HTMLButtonElement>("[data-buzzer-submit='wrong']");
      const clicked = vi.fn();
      wrongSubmit?.addEventListener("click", clicked);

      const sendButton = modal?.querySelector<HTMLButtonElement>("[data-buzzer-result='wrong']");
      sendButton?.click();

      expect(clicked).toHaveBeenCalledOnce();

      teardownControllerTest(application);
    });
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

import { describe, expect, it } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import type { ButtonId } from "../../lib/buzzer/button_id";
import BuzzerEmulatorController from "../buzzer_emulator_controller";

function createHTML(): string {
  return `
    <div data-controller="buzzer-emulator">
      <span data-buzzer-emulator-target="lastPressed">未入力</span>
      <button
        type="button"
        data-button-id="1"
        data-action="click->buzzer-emulator#pressButton"
      >
        1
      </button>
      <button
        type="button"
        data-action="click->buzzer-emulator#reset"
      >
        reset
      </button>
      <button
        type="button"
        data-action="click->buzzer-emulator#correct"
      >
        正解
      </button>
      <button
        type="button"
        data-action="click->buzzer-emulator#wrong"
      >
        誤答
      </button>
    </div>
  `;
}

describe("BuzzerEmulatorController", () => {
  it("buzzer:emulator:button-press イベントを受け取ると最終押下表示を更新する", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    window.dispatchEvent(
      new CustomEvent<{ buttonId: ButtonId }>("buzzer:emulator:button-press", {
        detail: { buttonId: 2 as ButtonId },
      }),
    );

    const lastPressed = element.querySelector('[data-buzzer-emulator-target="lastPressed"]');
    expect(lastPressed?.textContent).toBe("2");

    teardownControllerTest(application);
  });

  it("buzzer:serial:button-press イベントを受け取っても最終押下表示を更新しない", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    window.dispatchEvent(
      new CustomEvent<{ buttonId: ButtonId }>("buzzer:serial:button-press", {
        detail: { buttonId: 5 as ButtonId },
      }),
    );

    const lastPressed = element.querySelector('[data-buzzer-emulator-target="lastPressed"]');
    expect(lastPressed?.textContent).toBe("未入力");

    teardownControllerTest(application);
  });

  it("押下ボタンで button-press イベントを送出する", async () => {
    let buttonId: number | null = null;
    const handler = (event: Event) => {
      buttonId = (event as CustomEvent<{ buttonId: ButtonId }>).detail.buttonId;
    };
    window.addEventListener("buzzer:emulator:button-press", handler);

    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#pressButton"]');
    if (!button) throw new Error("required element not found");

    button.dispatchEvent(new Event("click"));
    expect(buttonId).toBe(1);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:emulator:button-press", handler);
  });

  it("resetボタンで reset イベントを送出する", async () => {
    let called = false;
    const handler = () => {
      called = true;
    };
    window.addEventListener("buzzer:emulator:reset", handler);

    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#reset"]');
    if (!button) throw new Error("required element not found");

    button.dispatchEvent(new Event("click"));
    expect(called).toBe(true);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:emulator:reset", handler);
  });

  it("正解ボタンクリックで最終押下が「正解」になる", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#correct"]');
    if (!button) throw new Error("required element not found");
    button.dispatchEvent(new Event("click"));

    const lastPressed = element.querySelector('[data-buzzer-emulator-target="lastPressed"]');
    expect(lastPressed?.textContent).toBe("正解");

    teardownControllerTest(application);
  });

  it("誤答ボタンクリックで最終押下が「誤答」になる", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#wrong"]');
    if (!button) throw new Error("required element not found");
    button.dispatchEvent(new Event("click"));

    const lastPressed = element.querySelector('[data-buzzer-emulator-target="lastPressed"]');
    expect(lastPressed?.textContent).toBe("誤答");

    teardownControllerTest(application);
  });

  it("resetボタンクリックで最終押下が「リセット」になる", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#reset"]');
    if (!button) throw new Error("required element not found");
    button.dispatchEvent(new Event("click"));

    const lastPressed = element.querySelector('[data-buzzer-emulator-target="lastPressed"]');
    expect(lastPressed?.textContent).toBe("リセット");

    teardownControllerTest(application);
  });

  it("正解ボタンで buzzer:emulator:correct イベントを送出する", async () => {
    let called = false;
    const handler = () => {
      called = true;
    };
    window.addEventListener("buzzer:emulator:correct", handler);

    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#correct"]');
    if (!button) throw new Error("required element not found");

    button.dispatchEvent(new Event("click"));
    expect(called).toBe(true);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:emulator:correct", handler);
  });

  it("誤答ボタンで buzzer:emulator:wrong イベントを送出する", async () => {
    let called = false;
    const handler = () => {
      called = true;
    };
    window.addEventListener("buzzer:emulator:wrong", handler);

    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    const button = element.querySelector('[data-action="click->buzzer-emulator#wrong"]');
    if (!button) throw new Error("required element not found");

    button.dispatchEvent(new Event("click"));
    expect(called).toBe(true);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:emulator:wrong", handler);
  });
});

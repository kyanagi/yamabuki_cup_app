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
    </div>
  `;
}

describe("BuzzerEmulatorController", () => {
  it("接続時に現在状態の要求イベントを送出する", async () => {
    let requested = false;
    const requestHandler = () => {
      requested = true;
    };
    window.addEventListener("buzzer:view:request-state", requestHandler);

    const { application } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    expect(requested).toBe(true);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:view:request-state", requestHandler);
  });

  it("状態イベントを受け取ると最終押下表示を更新する", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    window.dispatchEvent(
      new CustomEvent("buzzer:state-changed", {
        detail: {
          learningSeat: null,
          lastPressedButtonId: 2,
          mapping: new Map<number, number>(),
        },
      }),
    );

    const lastPressed = element.querySelector('[data-buzzer-emulator-target="lastPressed"]');
    expect(lastPressed?.textContent).toBe("2");

    teardownControllerTest(application);
  });

  it("lastPressedButtonId が null の場合は未入力を表示する", async () => {
    const { application, element } = await setupControllerTest<BuzzerEmulatorController>(
      BuzzerEmulatorController,
      createHTML(),
      "buzzer-emulator",
    );

    window.dispatchEvent(
      new CustomEvent("buzzer:state-changed", {
        detail: {
          learningSeat: null,
          lastPressedButtonId: null,
          mapping: new Map<number, number>(),
        },
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
});

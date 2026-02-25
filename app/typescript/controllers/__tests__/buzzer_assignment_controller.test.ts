import { describe, expect, it } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import BuzzerAssignmentController from "../buzzer_assignment_controller";

function createHTML(): string {
  return `
    <div data-controller="buzzer-assignment">
      <button type="button" data-action="click->buzzer-assignment#clearAllMappings">全消去</button>
      <table>
        <tbody>
          <tr data-buzzer-assignment-seat-row data-seat="0">
            <td data-buzzer-assignment-role="assignment">未割当</td>
            <td>
              <button
                type="button"
                data-seat="0"
                data-buzzer-assignment-role="learnButton"
                data-action="click->buzzer-assignment#startLearningSeat"
              >
                設定
              </button>
            </td>
          </tr>
          <tr data-buzzer-assignment-seat-row data-seat="1">
            <td data-buzzer-assignment-role="assignment">未割当</td>
            <td>
              <button
                type="button"
                data-seat="1"
                data-buzzer-assignment-role="learnButton"
                data-action="click->buzzer-assignment#startLearningSeat"
              >
                設定
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

describe("BuzzerAssignmentController", () => {
  it("接続時に現在状態の要求イベントを送出する", async () => {
    let requested = false;
    const requestHandler = () => {
      requested = true;
    };
    window.addEventListener("buzzer:view:request-state", requestHandler);

    const { application } = await setupControllerTest<BuzzerAssignmentController>(
      BuzzerAssignmentController,
      createHTML(),
      "buzzer-assignment",
    );

    expect(requested).toBe(true);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:view:request-state", requestHandler);
  });

  it("状態イベントを受け取ると割り当て表示を更新する", async () => {
    const { application, element } = await setupControllerTest<BuzzerAssignmentController>(
      BuzzerAssignmentController,
      createHTML(),
      "buzzer-assignment",
    );

    window.dispatchEvent(
      new CustomEvent("buzzer:state-changed", {
        detail: {
          learningSeat: 0,
          lastPressedButtonId: 2,
          mapping: new Map([[2, 1]]),
        },
      }),
    );

    const row0 = element.querySelector('[data-buzzer-assignment-seat-row][data-seat="0"]');
    const row1 = element.querySelector('[data-buzzer-assignment-seat-row][data-seat="1"]');
    const assignment0 = row0?.querySelector('[data-buzzer-assignment-role="assignment"]');
    const assignment1 = row1?.querySelector('[data-buzzer-assignment-role="assignment"]');
    const learnButton0 = row0?.querySelector('[data-buzzer-assignment-role="learnButton"]');
    if (!assignment0 || !assignment1 || !learnButton0) throw new Error("required element not found");

    expect(assignment0.textContent).toBe("ボタンを押してください");
    expect(assignment1.textContent).toBe("ボタン 2");
    expect(learnButton0.textContent).toBe("待受中");
    expect(learnButton0.classList.contains("is-warning")).toBe(true);

    teardownControllerTest(application);
  });

  it("席設定ボタン押下で学習席トグルイベントを送出する", async () => {
    let seat: number | null = null;
    const handler = (event: Event) => {
      seat = (event as CustomEvent<{ seat: number }>).detail.seat;
    };
    window.addEventListener("buzzer:assignment:toggle-learning", handler);

    const { application, element } = await setupControllerTest<BuzzerAssignmentController>(
      BuzzerAssignmentController,
      createHTML(),
      "buzzer-assignment",
    );

    const button = element.querySelector('[data-action="click->buzzer-assignment#startLearningSeat"]');
    if (!button) throw new Error("required element not found");

    button.dispatchEvent(new Event("click"));
    expect(seat).toBe(0);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:assignment:toggle-learning", handler);
  });

  it("全消去ボタン押下で全消去イベントを送出する", async () => {
    let called = false;
    const handler = () => {
      called = true;
    };
    window.addEventListener("buzzer:assignment:clear", handler);

    const { application, element } = await setupControllerTest<BuzzerAssignmentController>(
      BuzzerAssignmentController,
      createHTML(),
      "buzzer-assignment",
    );

    const button = element.querySelector('[data-action="click->buzzer-assignment#clearAllMappings"]');
    if (!button) throw new Error("required element not found");

    button.dispatchEvent(new Event("click"));
    expect(called).toBe(true);

    teardownControllerTest(application);
    window.removeEventListener("buzzer:assignment:clear", handler);
  });
});

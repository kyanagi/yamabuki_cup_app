import { describe, expect, it, vi } from "vitest";

type StreamAction = (this: Element) => void;
type StreamActionsMap = {
  replace_question?: StreamAction;
  exit_paper_seed_plates?: StreamAction;
};

const { streamActions } = vi.hoisted(() => ({
  streamActions: {} as StreamActionsMap,
}));

vi.mock("@hotwired/turbo", () => ({
  StreamActions: streamActions,
}));

import "./stream_actions";

function findExitPaperSeedPlatesAction(): StreamAction {
  const action = streamActions.exit_paper_seed_plates;
  if (!action) {
    throw new Error("exit_paper_seed_plates action is not registered");
  }

  return action;
}

describe("scoreboard stream actions", () => {
  it("exit_paper_seed_plates が登録される", () => {
    expect(streamActions.exit_paper_seed_plates).toBeTypeOf("function");
  });

  it("紙シードのプレートに退出クラスを付与し、アニメーション終了後も要素を保持して位置を維持する", () => {
    document.body.innerHTML = `
      <div id="scoreboard-main">
        <div class="paper-seed-player" id="plate-1"></div>
        <div class="paper-seed-player" id="plate-2"></div>
      </div>
    `;
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("target", "scoreboard-main");

    findExitPaperSeedPlatesAction().call(streamElement);

    const plate1 = document.getElementById("plate-1");
    const plate2 = document.getElementById("plate-2");
    expect(plate1?.classList.contains("paper-seed-player--exiting")).toBe(true);
    expect(plate2?.classList.contains("paper-seed-player--exiting")).toBe(true);
    expect((plate1 as HTMLElement | null)?.style.animationDelay).toBe("0s");
    expect((plate2 as HTMLElement | null)?.style.animationDelay).toBe("0.05s");

    plate1?.dispatchEvent(new Event("animationend"));
    plate2?.dispatchEvent(new Event("animationend"));

    const plate1After = document.getElementById("plate-1");
    const plate2After = document.getElementById("plate-2");
    expect(plate1After).not.toBeNull();
    expect(plate2After).not.toBeNull();
    expect(plate1After?.classList.contains("paper-seed-player--exited")).toBe(true);
    expect(plate2After?.classList.contains("paper-seed-player--exited")).toBe(true);
  });

  it("target が存在しない場合は何もしない", () => {
    document.body.innerHTML = '<div id="other"></div>';
    const streamElement = document.createElement("turbo-stream");
    streamElement.setAttribute("target", "scoreboard-main");

    expect(() => findExitPaperSeedPlatesAction().call(streamElement)).not.toThrow();
  });
});

/**
 * Scoreboard 専用の Turbo Stream カスタムアクション
 *
 * このファイルは副作用として StreamActions にアクションを登録する。
 * @hotwired/turbo-rails の後にインポートする必要がある。
 */
import { StreamActions } from "@hotwired/turbo";

// カスタム Turbo Stream アクション: 問題表示を切り替え
// - 空テンプレートの場合: 現在の問題を消去（アニメーション付き）
// - 非空テンプレートの場合: 現在の問題を消去後、新しい問題を表示
StreamActions.replace_question = function (this: Element) {
  const target = document.getElementById(this.getAttribute("target") || "");
  if (!target) return;

  const templateContent = this.querySelector("template")?.innerHTML || "";
  const existingQuestion = target.querySelector<HTMLElement>(".question");

  if (!existingQuestion) {
    // 問題が表示されていなければ、新しい問題を直接表示
    target.innerHTML = templateContent;
    return;
  }

  // 最新テンプレートを保持（連続送信時は上書きされる）
  // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for dataset
  existingQuestion.dataset["nextTemplate"] = templateContent;

  // すでにアニメーション中なら追加処理不要（リスナーは登録済み）
  if (existingQuestion.classList.contains("question--hiding")) return;

  existingQuestion.classList.add("question--hiding");
  existingQuestion.addEventListener(
    "animationend",
    () => {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for dataset
      const next = existingQuestion.dataset["nextTemplate"] || "";
      target.innerHTML = next;
    },
    { once: true },
  );
};

// カスタム Turbo Stream アクション: シード発表の全プレートを退出アニメーション付きで消去
StreamActions.exit_paper_seed_plates = function (this: Element) {
  const target = document.getElementById(this.getAttribute("target") || "");
  if (!target) return;

  const plates = target.querySelectorAll<HTMLElement>(".paper-seed-player");
  if (plates.length === 0) return;

  plates.forEach((plate, index) => {
    if (
      plate.classList.contains("paper-seed-player--exiting") ||
      plate.classList.contains("paper-seed-player--exited")
    ) {
      return;
    }

    plate.style.animationDelay = `${index * 0.05}s`;
    plate.classList.add("paper-seed-player--exiting");
    plate.addEventListener(
      "animationend",
      () => {
        plate.classList.remove("paper-seed-player--exiting");
        plate.classList.add("paper-seed-player--exited");
        plate.style.animationDelay = "";
      },
      { once: true },
    );
  });
};

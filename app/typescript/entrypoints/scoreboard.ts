import "@hotwired/turbo-rails";
import { StreamActions } from "@hotwired/turbo";
import { createConsumer } from "@rails/actioncable";

import { application } from "../controllers/application";

// カスタム Turbo Stream アクション: 問題表示を消去（アニメーション付き）
StreamActions.clear_question = function () {
  const target = document.getElementById(this.getAttribute("target") || "");
  if (!target) return;

  const questionElement = target.querySelector(".question");
  if (!questionElement) {
    target.innerHTML = "";
    return;
  }

  questionElement.classList.add("question--hiding");
  questionElement.addEventListener(
    "animationend",
    () => {
      target.innerHTML = "";
    },
    { once: true },
  );
};

// カスタム Turbo Stream アクション: 問題表示を切り替え（消去アニメーション→表示アニメーション）
StreamActions.replace_question = function () {
  const target = document.getElementById(this.getAttribute("target") || "");
  if (!target) return;

  const templateContent = this.querySelector("template")?.innerHTML || "";
  const existingQuestion = target.querySelector(".question");

  if (existingQuestion) {
    // 既存の問題を消去アニメーション付きで削除してから新問題を表示
    existingQuestion.classList.add("question--hiding");
    existingQuestion.addEventListener(
      "animationend",
      () => {
        target.innerHTML = templateContent;
      },
      { once: true },
    );
  } else {
    // 問題がなければ直接表示
    target.innerHTML = templateContent;
  }
};

// Stimulus controllers
import ClockController from "../controllers/clock_controller";
import Round1TimerController from "../controllers/round1_timer_controller";
import ScoreVisibilityTogglerController from "../controllers/score_visibility_toggler_controller";
application.register("clock", ClockController);
application.register("round1-timer", Round1TimerController);
application.register("score-visibility-toggler", ScoreVisibilityTogglerController);

const cable = createConsumer();

cable.subscriptions.create(
  { channel: "ScoreboardChannel" },
  {
    connected: () => {
      console.log("ScoreboardChannel connected");
    },
    disconnected: () => {
      console.log("ScoreboardChannel disconnected");
    },
    received: (data) => {
      console.log("ScoreboardChannel received", data);
      if (typeof data === "object") {
        console.log("object");
      } else if (typeof data === "string") {
        console.log("string");
      }
    },
  },
);

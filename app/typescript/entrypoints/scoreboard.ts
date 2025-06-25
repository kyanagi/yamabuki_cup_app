import "@hotwired/turbo-rails";
import { createConsumer } from "@rails/actioncable";

import { application } from "../controllers/application";
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

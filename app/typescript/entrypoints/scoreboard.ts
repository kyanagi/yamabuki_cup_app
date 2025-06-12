import "@hotwired/turbo-rails";
import { createConsumer } from "@rails/actioncable";

// Stimulus controllers
import Round1TimerController from "../controllers/round1_timer_controller";
import { application } from "../controllers/application";
application.register("round1-timer", Round1TimerController);

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

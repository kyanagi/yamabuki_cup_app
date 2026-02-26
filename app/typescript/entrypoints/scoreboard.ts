import "@hotwired/turbo-rails";
// Turbo Stream カスタムアクション（副作用登録、turbo-rails の後に読み込む）
import "../lib/scoreboard/stream_actions";
import { createConsumer } from "@rails/actioncable";

import { application } from "../controllers/application";
import BuzzerScoreboardController from "../controllers/buzzer_scoreboard_controller";
// Stimulus controllers
import ClockController from "../controllers/clock_controller";
import Round1TimerController from "../controllers/round1_timer_controller";
import ScoreVisibilityTogglerController from "../controllers/score_visibility_toggler_controller";

application.register("clock", ClockController);
application.register("buzzer-scoreboard", BuzzerScoreboardController);
application.register("round1-timer", Round1TimerController);
application.register("score-visibility-toggler", ScoreVisibilityTogglerController);

const cable = createConsumer();

cable.subscriptions.create({ channel: "ScoreboardChannel" });

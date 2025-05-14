import { application } from "./application";
import HelloController from "./hello_controller";
import CurrentQuestionController from "./current_question_controller";

application.register("hello", HelloController);
application.register("current-question", CurrentQuestionController);

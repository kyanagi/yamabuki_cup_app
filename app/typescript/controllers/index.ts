import { application } from "./application";
import HelloController from "./hello_controller";
import CurrentQuestionController from "./current_question_controller";
import QuizReaderController from "./quiz_reader_controller";

application.register("hello", HelloController);
application.register("current-question", CurrentQuestionController);
application.register("quiz-reader", QuizReaderController);

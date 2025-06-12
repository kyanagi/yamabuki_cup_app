import { application } from "./application";
import HelloController from "./hello_controller";
import QuizReaderController from "./quiz_reader_controller";
import ModalController from "./modal_controller";
import CheckboxHiddenTogglerController from "./checkbox_hidden_toggler_controller";

application.register("hello", HelloController);
application.register("modal", ModalController);
application.register("checkbox-hidden-toggler", CheckboxHiddenTogglerController);

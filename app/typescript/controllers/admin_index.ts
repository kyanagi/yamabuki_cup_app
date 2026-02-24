import { application } from "./application";
import BuzzerAssignmentController from "./buzzer_assignment_controller";
import BuzzerControlController from "./buzzer_control_controller";
import BuzzerEmulatorController from "./buzzer_emulator_controller";
import CheckboxHiddenTogglerController from "./checkbox_hidden_toggler_controller";
import ModalController from "./modal_controller";
import PlayerNameLookupController from "./player_name_lookup_controller";
import QuizReaderController from "./quiz_reader_controller";

application.register("buzzer-assignment", BuzzerAssignmentController);
application.register("buzzer-control", BuzzerControlController);
application.register("buzzer-emulator", BuzzerEmulatorController);
application.register("modal", ModalController);
application.register("checkbox-hidden-toggler", CheckboxHiddenTogglerController);
application.register("player-name-lookup", PlayerNameLookupController);
application.register("quiz-reader", QuizReaderController);

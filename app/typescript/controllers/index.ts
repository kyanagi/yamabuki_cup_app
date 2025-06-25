import { application } from "./application";
import ClockController from "./clock_controller";
import EntryFormController from "./entry_form_controller";
import ModalController from "./modal_controller";

application.register("clock", ClockController);
application.register("modal", ModalController);
application.register("entry-form", EntryFormController);

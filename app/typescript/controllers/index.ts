import { application } from "./application";
import EntryFormController from "./entry_form_controller";
import ModalController from "./modal_controller";

application.register("modal", ModalController);
application.register("entry-form", EntryFormController);

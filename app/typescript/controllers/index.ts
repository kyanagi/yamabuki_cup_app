import { application } from "./application";
import ModalController from "./modal_controller";
import EntryFormController from "./entry_form_controller"

application.register("modal", ModalController);
application.register("entry-form", EntryFormController);

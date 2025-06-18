import { Controller } from "@hotwired/stimulus";
import * as v from "valibot";

const EmailSchema = v.pipe(v.string(), v.email("有効なメールアドレスを入力してください"));
const PasswordSchema = v.pipe(v.string(), v.nonEmpty("パスワードを入力してください"));
const FamilyNameSchema = v.pipe(v.string(), v.nonEmpty("姓を入力してください"));
const GivenNameSchema = v.pipe(v.string(), v.nonEmpty("名を入力してください"));
const FamilyNameKanaSchema = v.pipe(v.string(), v.nonEmpty("姓のふりがなを入力してください"));
const GivenNameKanaSchema = v.pipe(v.string(), v.nonEmpty("名のふりがなを入力してください"));
const EntryListNameSchema = v.pipe(v.string(), v.nonEmpty("エントリーリストの名前を入力してください"));

export default class extends Controller {
  static values = { editMode: Boolean };
  static targets = [
    "formElement",
    "email",
    "password",
    "familyName",
    "givenName",
    "familyNameKana",
    "givenNameKana",
    "entryListName",
    "notes",
    "confirmationEmail",
    "confirmationFamilyName",
    "confirmationGivenName",
    "confirmationFamilyNameKana",
    "confirmationGivenNameKana",
    "confirmationEntryListName",
    "confirmationNotes",
    "confirmationPassword",
    "errorElement",
    "emailError",
    "passwordError",
    "familyNameError",
    "givenNameError",
    "familyNameKanaError",
    "givenNameKanaError",
    "entryListNameError",
  ];

  declare formElementTargets: HTMLElement[];
  declare emailTarget: HTMLInputElement;
  declare passwordTarget: HTMLInputElement;
  declare familyNameTarget: HTMLInputElement;
  declare givenNameTarget: HTMLInputElement;
  declare familyNameKanaTarget: HTMLInputElement;
  declare givenNameKanaTarget: HTMLInputElement;
  declare entryListNameTarget: HTMLInputElement;
  declare notesTarget: HTMLTextAreaElement;
  declare confirmationEmailTarget: HTMLElement;
  declare confirmationFamilyNameTarget: HTMLElement;
  declare confirmationGivenNameTarget: HTMLElement;
  declare confirmationFamilyNameKanaTarget: HTMLElement;
  declare confirmationGivenNameKanaTarget: HTMLElement;
  declare confirmationEntryListNameTarget: HTMLElement;
  declare confirmationNotesTarget: HTMLElement;
  declare confirmationPasswordTarget: HTMLElement;
  declare errorElementTargets: HTMLElement[];
  declare emailErrorTarget: HTMLElement;
  declare passwordErrorTarget: HTMLElement;
  declare familyNameErrorTarget: HTMLElement;
  declare givenNameErrorTarget: HTMLElement;
  declare familyNameKanaErrorTarget: HTMLElement;
  declare givenNameKanaErrorTarget: HTMLElement;
  declare entryListNameErrorTarget: HTMLElement;
  declare editModeValue: boolean;
  declare hasNotesTarget: boolean;
  declare hasConfirmationPasswordTarget: boolean;

  validate(event: Event) {
    for (const element of this.formElementTargets) {
      element.classList.remove("is-danger");
    }

    for (const element of this.errorElementTargets) {
      element.textContent = "";
    }

    let isValid = true;
    isValid = this.validateField(EmailSchema, this.emailTarget, this.emailErrorTarget) && isValid;

    // Skip password validation in edit mode
    if (!this.editModeValue) {
      isValid = this.validateField(PasswordSchema, this.passwordTarget, this.passwordErrorTarget) && isValid;
    }
    isValid = this.validateField(FamilyNameSchema, this.familyNameTarget, this.familyNameErrorTarget) && isValid;
    isValid = this.validateField(GivenNameSchema, this.givenNameTarget, this.givenNameErrorTarget) && isValid;
    isValid =
      this.validateField(FamilyNameKanaSchema, this.familyNameKanaTarget, this.familyNameKanaErrorTarget) && isValid;
    isValid =
      this.validateField(GivenNameKanaSchema, this.givenNameKanaTarget, this.givenNameKanaErrorTarget) && isValid;
    isValid =
      this.validateField(EntryListNameSchema, this.entryListNameTarget, this.entryListNameErrorTarget) && isValid;

    if (!isValid) {
      event.stopImmediatePropagation();
    }
  }

  private validateField(
    schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
    target: HTMLInputElement,
    errorTarget: HTMLElement,
  ): boolean {
    const result = v.safeParse(schema, target.value);
    if (!result.success) {
      target.classList.add("is-danger");
      errorTarget.textContent = result.issues[0].message;
      return false;
    }
    return true;
  }

  updateConfirmationDisplay() {
    this.confirmationEmailTarget.textContent = this.emailTarget.value;
    this.confirmationFamilyNameTarget.textContent = this.familyNameTarget.value;
    this.confirmationGivenNameTarget.textContent = this.givenNameTarget.value;
    this.confirmationFamilyNameKanaTarget.textContent = this.familyNameKanaTarget.value;
    this.confirmationGivenNameKanaTarget.textContent = this.givenNameKanaTarget.value;
    this.confirmationEntryListNameTarget.textContent = this.entryListNameTarget.value;

    // Only update notes if it exists (registration form)
    if (this.hasNotesTarget) {
      this.confirmationNotesTarget.textContent = this.notesTarget.value;
    }

    // Only update password confirmation if it exists (edit form)
    if (this.hasConfirmationPasswordTarget) {
      const passwordValue = this.passwordTarget.value;
      this.confirmationPasswordTarget.textContent = passwordValue ? "変更あり" : "変更なし";
    }
  }
}

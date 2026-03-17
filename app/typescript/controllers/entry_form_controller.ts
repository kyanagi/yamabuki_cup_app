import { Controller } from "@hotwired/stimulus";
import * as v from "valibot";

const EmailSchema = v.pipe(v.string(), v.email("有効なメールアドレスを入力してください"));
const PasswordSchema = v.pipe(v.string(), v.nonEmpty("パスワードを入力してください"));
const FamilyNameSchema = v.pipe(v.string(), v.nonEmpty("姓を入力してください"));
const GivenNameSchema = v.pipe(v.string(), v.nonEmpty("名を入力してください"));
const FamilyNameKanaSchema = v.pipe(v.string(), v.nonEmpty("姓（ふりがな）を入力してください"));
const GivenNameKanaSchema = v.pipe(v.string(), v.nonEmpty("名（ふりがな）を入力してください"));
const EntryListNameSchema = v.pipe(v.string(), v.nonEmpty("エントリーリストの名前を入力してください"));

type ValidationValueTargetKey =
  | "emailTarget"
  | "passwordTarget"
  | "familyNameTarget"
  | "givenNameTarget"
  | "familyNameKanaTarget"
  | "givenNameKanaTarget"
  | "entryListNameTarget";
type ValidationErrorTargetKey =
  | "emailErrorTarget"
  | "passwordErrorTarget"
  | "familyNameErrorTarget"
  | "givenNameErrorTarget"
  | "familyNameKanaErrorTarget"
  | "givenNameKanaErrorTarget"
  | "entryListNameErrorTarget";
type ValidationFieldDefinition = {
  schema: v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
  valueTarget: ValidationValueTargetKey;
  errorTarget: ValidationErrorTargetKey;
  skipInEditMode?: boolean;
};
const ValidationFields: readonly ValidationFieldDefinition[] = [
  { schema: EmailSchema, valueTarget: "emailTarget", errorTarget: "emailErrorTarget" },
  {
    schema: PasswordSchema,
    valueTarget: "passwordTarget",
    errorTarget: "passwordErrorTarget",
    skipInEditMode: true,
  },
  {
    schema: FamilyNameSchema,
    valueTarget: "familyNameTarget",
    errorTarget: "familyNameErrorTarget",
  },
  { schema: GivenNameSchema, valueTarget: "givenNameTarget", errorTarget: "givenNameErrorTarget" },
  {
    schema: FamilyNameKanaSchema,
    valueTarget: "familyNameKanaTarget",
    errorTarget: "familyNameKanaErrorTarget",
  },
  {
    schema: GivenNameKanaSchema,
    valueTarget: "givenNameKanaTarget",
    errorTarget: "givenNameKanaErrorTarget",
  },
  {
    schema: EntryListNameSchema,
    valueTarget: "entryListNameTarget",
    errorTarget: "entryListNameErrorTarget",
  },
] as const;

type ConfirmationValueTargetKey =
  | "emailTarget"
  | "familyNameTarget"
  | "givenNameTarget"
  | "familyNameKanaTarget"
  | "givenNameKanaTarget"
  | "entryListNameTarget"
  | "notesTarget"
  | "passwordTarget"
  | "eventDayHelpTarget";
type ConfirmationDisplayTargetKey =
  | "confirmationEmailTarget"
  | "confirmationFamilyNameTarget"
  | "confirmationGivenNameTarget"
  | "confirmationFamilyNameKanaTarget"
  | "confirmationGivenNameKanaTarget"
  | "confirmationEntryListNameTarget"
  | "confirmationNotesTarget"
  | "confirmationPasswordTarget"
  | "confirmationEventDayHelpTarget";
type ConfirmationGuardKey = "hasNotesTarget" | "hasConfirmationPasswordTarget" | "hasConfirmationEventDayHelpTarget";
type ConfirmationFieldDefinition = {
  valueTarget: ConfirmationValueTargetKey;
  confirmationTarget: ConfirmationDisplayTargetKey;
  guard?: ConfirmationGuardKey;
  isCheckbox?: true;
  formatter?: (value: string | boolean) => string;
};
const ConfirmationFields: readonly ConfirmationFieldDefinition[] = [
  { valueTarget: "emailTarget", confirmationTarget: "confirmationEmailTarget" },
  { valueTarget: "familyNameTarget", confirmationTarget: "confirmationFamilyNameTarget" },
  { valueTarget: "givenNameTarget", confirmationTarget: "confirmationGivenNameTarget" },
  { valueTarget: "familyNameKanaTarget", confirmationTarget: "confirmationFamilyNameKanaTarget" },
  { valueTarget: "givenNameKanaTarget", confirmationTarget: "confirmationGivenNameKanaTarget" },
  { valueTarget: "entryListNameTarget", confirmationTarget: "confirmationEntryListNameTarget" },
  {
    valueTarget: "notesTarget",
    confirmationTarget: "confirmationNotesTarget",
    guard: "hasNotesTarget",
  },
  {
    valueTarget: "passwordTarget",
    confirmationTarget: "confirmationPasswordTarget",
    guard: "hasConfirmationPasswordTarget",
    formatter: (value) => (value ? "変更あり" : "変更なし"),
  },
  {
    valueTarget: "eventDayHelpTarget",
    confirmationTarget: "confirmationEventDayHelpTarget",
    guard: "hasConfirmationEventDayHelpTarget",
    isCheckbox: true,
    formatter: (value) => (value ? "当日のお手伝いを依頼してもよい" : "未選択"),
  },
] as const;

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
    "eventDayHelp",
    "confirmationEmail",
    "confirmationFamilyName",
    "confirmationGivenName",
    "confirmationFamilyNameKana",
    "confirmationGivenNameKana",
    "confirmationEntryListName",
    "confirmationNotes",
    "confirmationPassword",
    "confirmationEventDayHelp",
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
  declare eventDayHelpTarget: HTMLInputElement;
  declare confirmationEmailTarget: HTMLElement;
  declare confirmationFamilyNameTarget: HTMLElement;
  declare confirmationGivenNameTarget: HTMLElement;
  declare confirmationFamilyNameKanaTarget: HTMLElement;
  declare confirmationGivenNameKanaTarget: HTMLElement;
  declare confirmationEntryListNameTarget: HTMLElement;
  declare confirmationNotesTarget: HTMLElement;
  declare confirmationPasswordTarget: HTMLElement;
  declare confirmationEventDayHelpTarget: HTMLElement;
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
  declare hasConfirmationEventDayHelpTarget: boolean;

  validate(event: Event) {
    for (const element of this.formElementTargets) {
      element.classList.remove("is-danger");
    }

    for (const element of this.errorElementTargets) {
      element.textContent = "";
    }

    let isValid = true;
    for (const field of ValidationFields) {
      if (field.skipInEditMode && this.editModeValue) {
        continue;
      }
      isValid = this.validateField(field.schema, this[field.valueTarget], this[field.errorTarget]) && isValid;
    }

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
    for (const field of ConfirmationFields) {
      if (field.guard && !this[field.guard]) {
        continue;
      }
      const target = this[field.valueTarget];
      const value: string | boolean = field.isCheckbox ? (target as HTMLInputElement).checked : target.value;
      this[field.confirmationTarget].textContent = field.formatter ? field.formatter(value) : String(value);
    }
  }
}

import type { Application } from "@hotwired/stimulus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import EntryFormController from "../entry_form_controller";

type EntryFormFixtureOptions = {
  editMode?: boolean;
  includeNotes?: boolean;
  includeConfirmationPassword?: boolean;
};

function createEntryFormFixture({
  editMode = false,
  includeNotes = false,
  includeConfirmationPassword = false,
}: EntryFormFixtureOptions = {}): string {
  return `
    <div data-controller="entry-form" ${editMode ? 'data-entry-form-edit-mode-value="true"' : ""}>
      <input type="email" data-entry-form-target="formElement email" />
      <input type="password" data-entry-form-target="formElement password" />
      <input type="text" data-entry-form-target="formElement familyName" />
      <input type="text" data-entry-form-target="formElement givenName" />
      <input type="text" data-entry-form-target="formElement familyNameKana" />
      <input type="text" data-entry-form-target="formElement givenNameKana" />
      <input type="text" data-entry-form-target="formElement entryListName" />
      ${includeNotes ? '<textarea data-entry-form-target="formElement notes"></textarea>' : ""}

      <p data-entry-form-target="errorElement emailError"></p>
      <p data-entry-form-target="errorElement passwordError"></p>
      <p data-entry-form-target="errorElement familyNameError"></p>
      <p data-entry-form-target="errorElement givenNameError"></p>
      <p data-entry-form-target="errorElement familyNameKanaError"></p>
      <p data-entry-form-target="errorElement givenNameKanaError"></p>
      <p data-entry-form-target="errorElement entryListNameError"></p>

      <div data-entry-form-target="confirmationEmail"></div>
      <div data-entry-form-target="confirmationFamilyName"></div>
      <div data-entry-form-target="confirmationGivenName"></div>
      <div data-entry-form-target="confirmationFamilyNameKana"></div>
      <div data-entry-form-target="confirmationGivenNameKana"></div>
      <div data-entry-form-target="confirmationEntryListName"></div>
      ${includeNotes ? '<div data-entry-form-target="confirmationNotes"></div>' : ""}
      ${includeConfirmationPassword ? '<div data-entry-form-target="confirmationPassword"></div>' : ""}
    </div>
  `;
}

function findFieldTarget(element: HTMLElement, targetName: string): HTMLInputElement | HTMLTextAreaElement {
  const target = element.querySelector(`[data-entry-form-target~="${targetName}"]`);
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    throw new Error(`Field target not found: ${targetName}`);
  }
  return target;
}

function setFieldValue(element: HTMLElement, targetName: string, value: string): void {
  const target = findFieldTarget(element, targetName);
  target.value = value;
}

function errorText(element: HTMLElement, targetName: string): string {
  const target = element.querySelector(`[data-entry-form-target~="${targetName}"]`);
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Error target not found: ${targetName}`);
  }
  return target.textContent ?? "";
}

function confirmationText(element: HTMLElement, targetName: string): string {
  const target = element.querySelector(`[data-entry-form-target~="${targetName}"]`);
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Confirmation target not found: ${targetName}`);
  }
  return target.textContent ?? "";
}

describe("EntryFormController", () => {
  let application: Application | null = null;

  afterEach(() => {
    if (!application) {
      return;
    }
    teardownControllerTest(application);
    application = null;
  });

  async function setupEntryFormController(html: string) {
    const context = await setupControllerTest<EntryFormController>(EntryFormController, html, "entry-form");
    application = context.application;
    return context;
  }

  describe("validate()", () => {
    it("新規入力時は必須項目が不足していると全項目のエラーを表示する", async () => {
      const { controller, element } = await setupEntryFormController(createEntryFormFixture({ includeNotes: true }));

      const stopImmediatePropagation = vi.fn();
      controller.validate({ stopImmediatePropagation } as unknown as Event);

      expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
      expect(errorText(element, "emailError")).toBe("有効なメールアドレスを入力してください");
      expect(errorText(element, "passwordError")).toBe("パスワードを入力してください");
      expect(errorText(element, "familyNameError")).toBe("姓を入力してください");
      expect(errorText(element, "givenNameError")).toBe("名を入力してください");
      expect(errorText(element, "familyNameKanaError")).toBe("姓（ふりがな）を入力してください");
      expect(errorText(element, "givenNameKanaError")).toBe("名（ふりがな）を入力してください");
      expect(errorText(element, "entryListNameError")).toBe("エントリーリストの名前を入力してください");
    });

    it("編集モードではパスワード未入力でも他項目が有効なら通過する", async () => {
      const { controller, element } = await setupEntryFormController(
        createEntryFormFixture({ editMode: true, includeConfirmationPassword: true }),
      );

      setFieldValue(element, "email", "yamabuki@example.com");
      setFieldValue(element, "familyName", "山吹");
      setFieldValue(element, "givenName", "太郎");
      setFieldValue(element, "familyNameKana", "やまぶき");
      setFieldValue(element, "givenNameKana", "たろう");
      setFieldValue(element, "entryListName", "やまぶきたろう");

      const stopImmediatePropagation = vi.fn();
      controller.validate({ stopImmediatePropagation } as unknown as Event);

      expect(stopImmediatePropagation).not.toHaveBeenCalled();
      expect(errorText(element, "passwordError")).toBe("");
    });
  });

  describe("updateConfirmationDisplay()", () => {
    it("新規入力画面では確認表示に入力値を反映し、notes も更新する", async () => {
      const { controller, element } = await setupEntryFormController(createEntryFormFixture({ includeNotes: true }));

      setFieldValue(element, "email", "yamabuki@example.com");
      setFieldValue(element, "familyName", "山吹");
      setFieldValue(element, "givenName", "太郎");
      setFieldValue(element, "familyNameKana", "やまぶき");
      setFieldValue(element, "givenNameKana", "たろう");
      setFieldValue(element, "entryListName", "やまぶきたろう");
      setFieldValue(element, "notes", "連絡事項");

      controller.updateConfirmationDisplay();

      expect(confirmationText(element, "confirmationEmail")).toBe("yamabuki@example.com");
      expect(confirmationText(element, "confirmationFamilyName")).toBe("山吹");
      expect(confirmationText(element, "confirmationGivenName")).toBe("太郎");
      expect(confirmationText(element, "confirmationFamilyNameKana")).toBe("やまぶき");
      expect(confirmationText(element, "confirmationGivenNameKana")).toBe("たろう");
      expect(confirmationText(element, "confirmationEntryListName")).toBe("やまぶきたろう");
      expect(confirmationText(element, "confirmationNotes")).toBe("連絡事項");
    });

    it("編集画面ではパスワード確認表示を入力有無に応じて切り替える", async () => {
      const { controller, element } = await setupEntryFormController(
        createEntryFormFixture({ editMode: true, includeConfirmationPassword: true }),
      );

      setFieldValue(element, "email", "yamabuki@example.com");
      setFieldValue(element, "familyName", "山吹");
      setFieldValue(element, "givenName", "太郎");
      setFieldValue(element, "familyNameKana", "やまぶき");
      setFieldValue(element, "givenNameKana", "たろう");
      setFieldValue(element, "entryListName", "やまぶきたろう");

      controller.updateConfirmationDisplay();
      expect(confirmationText(element, "confirmationPassword")).toBe("変更なし");

      setFieldValue(element, "password", "new-password");
      controller.updateConfirmationDisplay();
      expect(confirmationText(element, "confirmationPassword")).toBe("変更あり");
    });
  });
});

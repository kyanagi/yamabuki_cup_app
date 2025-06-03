import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["hidden", "checkbox"];
  declare hiddenTarget: HTMLInputElement;
  declare checkboxTarget: HTMLInputElement;

  connect() {
    this.toggleHidden();
  }

  toggle() {
    this.toggleHidden();
  }

  private toggleHidden() {
    if (!this.checkboxTarget.disabled) {
      this.hiddenTarget.disabled = this.checkboxTarget.checked;
    }
  }
}

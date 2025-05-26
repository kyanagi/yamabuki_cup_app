import { Controller } from "@hotwired/stimulus";

export default class ModalController extends Controller {
  static targets = ["modal"];
  declare modalTarget: HTMLElement;

  open() {
    this.modalTarget.classList.add("is-active");
  }

  close() {
    this.modalTarget.classList.remove("is-active");
  }
}

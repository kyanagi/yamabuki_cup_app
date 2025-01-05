import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["name", "output"];
  declare nameTarget: HTMLInputElement;
  declare outputTarget: HTMLElement;

  connect() {
    console.log("Hello, Stimulus!");
  }

  greet() {
    this.outputTarget.textContent = `Hello, ${this.nameTarget.value}!`;
  }
}

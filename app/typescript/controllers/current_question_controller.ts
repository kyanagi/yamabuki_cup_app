import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["questionId", "text", "answer", "anotherAnswer", "note"];
  declare questionIdTarget: HTMLElement;
  declare textTarget: HTMLElement;
  declare answerTarget: HTMLElement;
  declare anotherAnswerTarget: HTMLElement;
  declare noteTarget: HTMLElement;

  connect() {
    console.log("Hello, Stimulus!");
  }

  promptQuestionNumber(event: Event) {
    event.preventDefault();
    const questionId = prompt("問題番号を入力してください");
    if (questionId) {
      const formData = new FormData();
      formData.append("question_id", questionId);
      fetch("/admin/current_question", {
        method: "PATCH",
        headers: {
          "X-CSRF-Token": document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || "",
        },
        body: formData,
      });
    }
  }
}

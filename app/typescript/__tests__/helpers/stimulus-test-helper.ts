/**
 * Stimulus コントローラーのテストヘルパー
 */
import { Application } from "@hotwired/stimulus";

interface ControllerTestContext<T> {
  application: Application;
  controller: T;
  element: HTMLElement;
}

/**
 * Stimulus コントローラーをテスト用にセットアップする
 */
export async function setupControllerTest<T>(
  ControllerClass: { new (...args: unknown[]): T },
  html: string,
  identifier: string,
): Promise<ControllerTestContext<T>> {
  // DOM をセットアップ
  document.body.innerHTML = html;

  const element = document.querySelector(`[data-controller="${identifier}"]`);
  if (!element) {
    throw new Error(`Controller element not found for identifier: ${identifier}`);
  }

  // Stimulus アプリケーションを作成
  const application = Application.start();
  application.register(identifier, ControllerClass as never);

  // コントローラーが接続されるまで待機
  await new Promise((resolve) => setTimeout(resolve, 0));

  const controller = application.getControllerForElementAndIdentifier(element as HTMLElement, identifier) as T;

  if (!controller) {
    throw new Error(`Controller not found for identifier: ${identifier}`);
  }

  return {
    application,
    controller,
    element: element as HTMLElement,
  };
}

/**
 * テスト後のクリーンアップ
 */
export function teardownControllerTest(application: Application): void {
  application.stop();
  document.body.innerHTML = "";
}

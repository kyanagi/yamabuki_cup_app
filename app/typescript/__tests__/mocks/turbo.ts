/**
 * Turbo (@hotwired/turbo-rails) のモック
 */
import { vi } from "vitest";

export const mockRenderStreamMessage = vi.fn();

export const MockTurbo = {
  renderStreamMessage: mockRenderStreamMessage,
};

export function resetTurboMock(): void {
  mockRenderStreamMessage.mockReset();
}

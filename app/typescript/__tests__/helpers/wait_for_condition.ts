export type WaitForConditionOptions = {
  timeoutMs?: number;
  intervalMs?: number;
};

export async function waitForCondition(predicate: () => boolean, options: WaitForConditionOptions = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 1000;
  const intervalMs = options.intervalMs ?? 0;
  const startedAt = Date.now();

  while (true) {
    if (predicate()) return;

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`waitForCondition timeout: ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

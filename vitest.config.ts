import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./app/typescript/__tests__/setup.ts"],
    include: ["app/typescript/**/*.{test,spec}.ts"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
});

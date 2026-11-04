import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Enhets- og integrasjonstester. Kjører i Node, med en falsk AI-tjeneste
 * (se tests/helpers/fake-ai.ts) – ingen tester kaller ekte AI eller koster
 * penger. UI-tester ligger i tests/ui og kjøres med Playwright.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    testTimeout: 20_000,
  },
});

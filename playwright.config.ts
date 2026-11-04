import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * UI-tester mot en ferdig bygget app (`npm run build` først – se
 * `npm run test:ui`) og en falsk AI-tjeneste. Tre servere startes:
 * én åpen (som i dag), én med tilgangskode, og én der Upstash er satt opp
 * men ikke svarer (for å teste at AI-kall da avvises med norsk melding).
 */
const mock = `--import ${path.resolve(process.cwd(), "tests/mocks/openrouter-mock.mjs")}`;
const felles = {
  OPENROUTER_API_KEY: "test-nokkel-ikke-ekte",
  ARTSORAKEL_TEST_MOCK_AI: "1",
  ARTSORAKEL_HEMMELIGHET: "ui-test-hemmelighet",
  NODE_OPTIONS: mock,
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "tests/ui",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { ...devices["Pixel 7"], trace: "retain-on-failure" },
  projects: [
    { name: "åpen", testMatch: /app\.spec\.ts/, use: { baseURL: "http://localhost:3201" } },
    { name: "tilgangskode", testMatch: /tilgang\.spec\.ts/, use: { baseURL: "http://localhost:3202" } },
    { name: "upstash-nede", testMatch: /upstash-nede\.spec\.ts/, use: { baseURL: "http://localhost:3203" } },
  ],
  webServer: [
    {
      command: "npx next start -p 3201",
      url: "http://localhost:3201",
      env: felles,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npx next start -p 3202",
      url: "http://localhost:3202",
      env: { ...felles, ARTSORAKEL_TILGANGSKODE: "ansatt-kode-2026" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npx next start -p 3203",
      url: "http://localhost:3203",
      // Upstash er «satt opp», men ingen svarer på adressen.
      env: { ...felles, UPSTASH_REDIS_REST_URL: "http://127.0.0.1:1", UPSTASH_REDIS_REST_TOKEN: "test" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});

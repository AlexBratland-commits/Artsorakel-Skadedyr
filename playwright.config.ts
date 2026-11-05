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
    { name: "åpen", testMatch: /(app|ekskrementer|heic|endringer-etter-test|assistent|historikk|tema|revisjon|m9|h1|h3|m3|h5)\.spec\.ts/, use: { baseURL: "http://localhost:3201" } },
    {
      name: "pc",
      testMatch: /(assistent-pc|tema|pdf-samtale)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3201" },
    },
    {
      name: "iphone-se",
      testMatch: /(boble-og-pdf|boble-scroll|pdf-samtale)\.spec\.ts/,
      use: { ...devices["iPhone SE"], browserName: "chromium", baseURL: "http://localhost:3201" },
    },
    {
      name: "iphone-13",
      testMatch: /(boble-og-pdf|boble-scroll|pdf-samtale)\.spec\.ts/,
      use: { ...devices["iPhone 13"], browserName: "chromium", baseURL: "http://localhost:3201" },
    },
    { name: "tilgangskode", testMatch: /tilgang\.spec\.ts/, use: { baseURL: "http://localhost:3202" } },
    { name: "upstash-nede", testMatch: /upstash-nede\.spec\.ts/, use: { baseURL: "http://localhost:3203" } },
  ],
  webServer: [
    {
      command: "npx next start -p 3201",
      url: "http://localhost:3201",
      // Mange analyser og chattespørsmål etter hverandre fra samme IP i UI-testene:
      // hev bare disse grensene her. Selve grensene testes i Vitest.
      env: { ...felles, ARTSORAKEL_CHAT_PER_MINUTT: "100", ARTSORAKEL_ANALYSER_PER_TIME: "500" },
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

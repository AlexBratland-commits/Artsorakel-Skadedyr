/**
 * Vercel Production/Preview skal aldri starte med svekket sikkerhet:
 * mangler Upstash, signeringshemmelighet eller tilgangskode, avvises
 * forespørsler – og tellere i minnet brukes aldri. Lokal utvikling er unntatt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAi } from "../helpers/fake-ai";
import { analyzeRequest, jpeg, jsonRequest } from "../helpers/requests";

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "");
  vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function last() {
  vi.resetModules();
  return {
    analyze: (await import("@/app/api/analyze/route")).POST,
    chat: (await import("@/app/api/ask-about-findings/route")).POST,
    tilgang: await import("@/app/api/tilgang/route"),
    oppsett: await import("@/lib/server/oppsett"),
    store: await import("@/lib/server/store"),
  };
}

describe.each(["production", "preview"])("Vercel %s", (miljo) => {
  beforeEach(() => vi.stubEnv("VERCEL_ENV", miljo));

  it("uten sikkerhetsinnstillinger avvises analyse, chat og innlogging – AI-en kalles ikke", async () => {
    const ai = installFakeAi();
    const { analyze, chat, tilgang, oppsett } = await last();
    expect(oppsett.manglendeSikkerhetsoppsett()).toEqual([
      "ARTSORAKEL_HEMMELIGHET",
      "Upstash (KV_REST_API_URL og KV_REST_API_TOKEN)",
    ]);
    const a = await analyze(analyzeRequest({ image: await jpeg(1) }));
    expect(a.status).toBe(503);
    expect(await a.json()).toMatchObject({ kode: "ikke_konfigurert" });
    expect((await chat(jsonRequest("/api/ask-about-findings", { messages: [] }))).status).toBe(503);
    expect((await tilgang.POST(jsonRequest("/api/tilgang", { kode: "x" }))).status).toBe(503);
    expect(ai.calls).toHaveLength(0);
  });

  it("med hemmelighet og kode, men uten Upstash, avvises fortsatt (ingen tellere i minnet)", async () => {
    vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "lang-hemmelighet-for-test");
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "ansatt-kode-123");
    const ai = installFakeAi();
    const { analyze, oppsett, store } = await last();
    expect(oppsett.manglendeSikkerhetsoppsett()).toEqual(["Upstash (KV_REST_API_URL og KV_REST_API_TOKEN)"]);
    expect((await analyze(analyzeRequest({ image: await jpeg(2) }))).status).toBe(503);
    expect(ai.calls).toHaveLength(0);
    // Selv om oppsettkontrollen skulle bli omgått, teller ikke lageret i minnet:
    await expect(store.tellerLager().okn("k", 60)).rejects.toBeInstanceOf(store.LagerUtilgjengelig);
  });

  it("tilgangskoden er valgfri: hemmelighet og Upstash er nok", async () => {
    vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "lang-hemmelighet-for-test");
    vi.stubEnv("KV_REST_API_URL", "https://eksempel.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "t");
    const { oppsett } = await last();
    expect(oppsett.manglendeSikkerhetsoppsett()).toEqual([]);
  });

  it("uten tilgangskode er appen åpen, men bruksgrensene gjelder (mot ekte tellere)", async () => {
    vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "lang-hemmelighet-for-test");
    const store = await import("@/lib/server/store");
    const lager = new store.MinneLager();
    vi.resetModules();
    const s2 = await import("@/lib/server/store");
    s2._settLagerForTester(lager);
    vi.stubEnv("KV_REST_API_URL", "https://eksempel.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "t");
    installFakeAi();
    const { tilgangKreves } = await import("@/lib/server/access");
    expect(tilgangKreves()).toBe(false);
    const { POST } = await import("@/app/api/analyze/route");
    const statuser: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuser.push((await POST(analyzeRequest({ image: await jpeg(20 + i), headers: { "x-real-ip": "198.51.100.5" } }))).status);
    }
    expect(statuser.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuser[10]).toBe(429);
  });

  it("med tilgangskode satt kreves den fortsatt", async () => {
    vi.stubEnv("ARTSORAKEL_HEMMELIGHET", "lang-hemmelighet-for-test");
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "ansatt-kode-123");
    vi.resetModules();
    const { tilgangKreves } = await import("@/lib/server/access");
    expect(tilgangKreves()).toBe(true);
  });

  it("signering uten egen hemmelighet feiler i stedet for å bruke en avledet nøkkel", async () => {
    vi.resetModules();
    const { signer } = await import("@/lib/server/signing");
    expect(() => signer({ a: 1 }, "test")).toThrow(/ARTSORAKEL_HEMMELIGHET/);
  });
});

describe("lokal utvikling", () => {
  it("bruker fortsatt tellere i minnet og krever ikke innstillingene", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    installFakeAi();
    const { analyze, oppsett, store } = await last();
    expect(oppsett.manglendeSikkerhetsoppsett()).toEqual([]);
    expect(store.tellerLager().navn).toBe("minne");
    expect((await analyze(analyzeRequest({ image: await jpeg(3) }))).status).toBe(200);
  });

  it("vercel dev (VERCEL_ENV=development) regnes som lokal utvikling", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    const { oppsett } = await last();
    expect(oppsett.manglendeSikkerhetsoppsett()).toEqual([]);
  });
});

describe("tom saldo hos OpenRouter", () => {
  it("gir en norsk melding i stedet for «Analysen feilet»", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    installFakeAi({
      respond: () => new Response(JSON.stringify({ error: { message: "Insufficient credits" } }), { status: 402 }),
    });
    const { analyze, chat } = await last();
    const a = await analyze(analyzeRequest({ image: await jpeg(4) }));
    expect(a.status).toBe(503);
    expect(await a.json()).toMatchObject({ kode: "ai_saldo", error: expect.stringMatching(/saldoen er brukt opp/) });
    // Chatten (med gyldig billett fra en analyse) gir samme melding
    installFakeAi();
    const token = (await (await analyze(analyzeRequest({ image: await jpeg(5) }))).json()).chatToken;
    installFakeAi({ respond: () => new Response("{}", { status: 402 }) });
    const c = await chat(jsonRequest("/api/ask-about-findings", { chatToken: token, messages: [{ role: "user", content: "Hei" }] }));
    expect((await c.json()).kode).toBe("ai_saldo");
  });
});

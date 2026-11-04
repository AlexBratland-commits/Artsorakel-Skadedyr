/**
 * Atomisitet og fail-closed mot EKTE Redis (via en Upstash-lik REST-
 * oversetter, se tests/helpers/redis-upstash.ts).
 *
 * Viser at:
 *  - samtidige forespørsler fra mange ansatte aldri kan slippe flere
 *    gjennom enn døgnbudsjettet eller kostnadsrammen tillater
 *  - en teller alltid får utløpstid (feilen i forrige versjon kunne gi en
 *    teller som aldri utløp)
 *  - appen avviser AI-kall når Upstash er satt opp, men nede
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { harRedis, redisKommando, startRedisMedUpstashRest, type TestRedis } from "../helpers/redis-upstash";
import { installFakeAi } from "../helpers/fake-ai";
import { analyzeRequest, jpeg, jsonRequest } from "../helpers/requests";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { UpstashLager } from "@/lib/server/store";

let r: TestRedis;

// I CI skal testene mot ekte Redis aldri hoppes over i det stille.
it.runIf(Boolean(process.env.CI))("redis-server er installert i CI", () => {
  expect(harRedis).toBe(true);
});

describe.skipIf(!harRedis)("Upstash-tellere mot ekte Redis", () => {
  beforeAll(async () => {
    r = await startRedisMedUpstashRest();
  });
  afterAll(async () => {
    await r?.stopp();
  });
  beforeEach(async () => {
    await redisKommando(r.port, ["FLUSHALL"]);
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-v1-test");
    vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", r.url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", r.token);
    vi.stubEnv("KV_REST_API_URL", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  /** Lar kall til den lokale Redis-oversetteren gå til ekte fetch, og AI-kall til falsk AI. */
  function falskAiMedEkteUpstash(opts: Parameters<typeof installFakeAi>[0] = {}) {
    const ekte = globalThis.fetch;
    const ai = installFakeAi(opts);
    const falsk = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return url.startsWith(r.url) ? ekte(input, init) : falsk(input, init);
    });
    return ai;
  }

  it("100 samtidige økninger gir 100 ulike verdier, og nøkkelen har utløpstid", async () => {
    const l = new UpstashLager(r.url, r.token);
    const svar = await Promise.all(Array.from({ length: 100 }, () => l.okn("artsorakel:samtidig", 3600)));
    expect(new Set(svar.map((s) => s.antall)).size).toBe(100);
    expect(Math.max(...svar.map((s) => s.antall))).toBe(100);
    const ttl = Number(await redisKommando(r.port, ["TTL", "artsorakel:samtidig"]));
    expect(ttl).toBeGreaterThan(3500);
  });

  it("en teller uten utløpstid (feilen i forrige versjon) får utløpstid ved neste økning", async () => {
    await redisKommando(r.port, ["SET", "artsorakel:foreldet", "5"]); // ingen TTL
    expect(await redisKommando(r.port, ["TTL", "artsorakel:foreldet"])).toBe(-1);
    await new UpstashLager(r.url, r.token).okn("artsorakel:foreldet", 60);
    const ttl = Number(await redisKommando(r.port, ["TTL", "artsorakel:foreldet"]));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("60 samtidige reservasjoner mot plass til 25 gir nøyaktig 25", async () => {
    const l = new UpstashLager(r.url, r.token);
    const svar = await Promise.all(Array.from({ length: 60 }, () => l.reserver("artsorakel:ramme", 4, 100, 3600)));
    expect(svar.filter((s) => s.ok)).toHaveLength(25);
    expect(await redisKommando(r.port, ["GET", "artsorakel:ramme"])).toBe("100");
  });

  it("døgnbudsjett: 20 ansatte analyserer samtidig, bare 5 slipper gjennom", async () => {
    vi.stubEnv("ARTSORAKEL_MAKS_ANALYSER_PER_DOGN", "5");
    const ai = falskAiMedEkteUpstash();
    vi.resetModules();
    const { POST } = await import("@/app/api/analyze/route");
    const bilder = await Promise.all(Array.from({ length: 20 }, (_, i) => jpeg(100 + i)));
    const svar = await Promise.all(
      bilder.map((bilde, i) => POST(analyzeRequest({ image: bilde, headers: { "x-forwarded-for": `198.51.100.${i}` } })))
    );
    const statuser = svar.map((s) => s.status);
    expect(statuser.filter((s) => s === 200)).toHaveLength(5);
    expect(statuser.filter((s) => s === 503)).toHaveLength(15);
    expect(ai.calls).toHaveLength(10); // 5 analyser × 2 AI-kall

    // Personvern: ingen IP-adresser i klartekst i Upstash
    const nokler = (await redisKommando(r.port, ["KEYS", "*"])) as string[];
    expect(nokler.some((k) => k.includes(":ip:"))).toBe(true);
    expect(nokler.join("\n")).not.toMatch(/198\.51\.100|v4:/);
  });

  it("kostnadsramme: samtidige AI-kall går ikke over rammen", async () => {
    // Plass til 6 kall à 0,02 USD = 0,12 USD. Hver analyse bruker 2 kall.
    vi.stubEnv("ARTSORAKEL_MAKS_KOSTNAD_PER_DOGN_USD", "0.12");
    vi.stubEnv("ARTSORAKEL_RESERVASJON_PER_AI_KALL_USD", "0.02");
    // OpenRouter oppgir ikke kostnad i dette testsvaret → reservasjonen beholdes
    const ai = falskAiMedEkteUpstash({ usage: { prompt_tokens: 1000, completion_tokens: 50 } });
    vi.resetModules();
    const { POST } = await import("@/app/api/analyze/route");
    const bilder = await Promise.all(Array.from({ length: 10 }, (_, i) => jpeg(200 + i)));
    const svar = await Promise.all(
      bilder.map((bilde, i) => POST(analyzeRequest({ image: bilde, headers: { "x-forwarded-for": `198.51.101.${i}` } })))
    );
    expect(ai.calls.length).toBeLessThanOrEqual(6);
    const brukt = Object.values(await redisKommando(r.port, ["KEYS", "artsorakel:kostnad:*"]) as string[]);
    expect(brukt).toHaveLength(1);
    expect(Number(await redisKommando(r.port, ["GET", brukt[0]]))).toBeLessThanOrEqual(120_000);
    const avvist = await Promise.all(svar.filter((s) => s.status === 503).map((s) => s.json()));
    expect(avvist.length).toBeGreaterThan(0);
    expect(avvist.every((a) => a.kode === "kostnadsramme")).toBe(true);
  });

  it("kostnad fra OpenRouter erstatter reservasjonen", async () => {
    vi.stubEnv("ARTSORAKEL_RESERVASJON_PER_AI_KALL_USD", "0.05");
    falskAiMedEkteUpstash({ usage: { prompt_tokens: 1000, completion_tokens: 50, cost: 0.0013 } });
    vi.resetModules();
    const { POST } = await import("@/app/api/analyze/route");
    expect((await POST(analyzeRequest({ image: await jpeg(300) }))).status).toBe(200);
    const [nokkel] = (await redisKommando(r.port, ["KEYS", "artsorakel:kostnad:*"])) as string[];
    expect(Number(await redisKommando(r.port, ["GET", nokkel]))).toBe(2600); // 2 × 0,0013 USD i mikrodollar
  });

  it("scripts/sjekk-upstash.mjs godkjenner et fungerende oppsett", async () => {
    const { stdout } = await promisify(execFile)("node", ["scripts/sjekk-upstash.mjs"], {
      env: { ...process.env, UPSTASH_REDIS_REST_URL: r.url, UPSTASH_REDIS_REST_TOKEN: r.token },
    });
    expect(stdout).toContain("Upstash er klart for Artsorakel");
  });

  it("scripts/sjekk-upstash.mjs varsler ved feil token", async () => {
    await expect(
      promisify(execFile)("node", ["scripts/sjekk-upstash.mjs"], {
        env: { ...process.env, UPSTASH_REDIS_REST_URL: r.url, UPSTASH_REDIS_REST_TOKEN: "feil" },
      })
    ).rejects.toMatchObject({ code: 1 });
  });

  describe("Upstash satt opp, men nede (fail closed)", () => {
    it("analyse, chat og innlogging avvises med norsk melding – AI-en kalles ikke", async () => {
      const ai = falskAiMedEkteUpstash();
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "http://127.0.0.1:1"); // ingen svarer her
      vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "");
      vi.resetModules();
      const { POST: analyser } = await import("@/app/api/analyze/route");
      const { POST: chat } = await import("@/app/api/ask-about-findings/route");

      const a = await analyser(analyzeRequest({ image: await jpeg(400) }));
      expect(a.status).toBe(503);
      const ab = await a.json();
      expect(ab.kode).toBe("grensekontroll_utilgjengelig");
      expect(ab.error).toMatch(/midlertidig utilgjengelig/);
      expect(a.headers.get("retry-after")).toBe("60");

      const c = await chat(jsonRequest("/api/ask-about-findings", { messages: [{ role: "user", content: "Hei" }] }));
      expect(c.status).toBe(503);
      expect(ai.calls).toHaveLength(0);

      vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "riktig-kode-123");
      vi.resetModules();
      const { POST: loggInn } = await import("@/app/api/tilgang/route");
      const l = await loggInn(jsonRequest("/api/tilgang", { kode: "riktig-kode-123" }));
      expect(l.status).toBe(503);
    });

    it("når Upstash går ned midt i bruk, faller appen ikke tilbake til minnet", async () => {
      // Egen Redis for denne testen, så de andre ikke påvirkes
      const egen = await startRedisMedUpstashRest();
      try {
        vi.stubEnv("UPSTASH_REDIS_REST_URL", egen.url);
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", egen.token);
        const ekte = globalThis.fetch;
        const ai = installFakeAi();
        const falsk = globalThis.fetch;
        vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          return url.startsWith(egen.url) ? ekte(input, init) : falsk(input, init);
        });
        vi.resetModules();
        const { POST } = await import("@/app/api/analyze/route");
        expect((await POST(analyzeRequest({ image: await jpeg(500) }))).status).toBe(200);
        const kallFor = ai.calls.length;
        await egen.stoppRest(); // Upstash går ned
        const res = await POST(analyzeRequest({ image: await jpeg(501) }));
        expect(res.status).toBe(503);
        expect((await res.json()).kode).toBe("grensekontroll_utilgjengelig");
        expect(ai.calls.length).toBe(kallFor);
      } finally {
        await egen.stopp();
      }
    });
  });
});

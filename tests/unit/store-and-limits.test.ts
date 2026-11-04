import { afterEach, describe, expect, it, vi } from "vitest";
import { MinneLager, RobustLager, UpstashLager, _settLagerForTester, tellerLager } from "@/lib/server/store";
import { analyseRegler, osloDato, sekunderTilMidnatt, sjekkGrenser } from "@/lib/server/limits";

afterEach(() => _settLagerForTester(undefined));

describe("tellere i minnet", () => {
  it("teller innenfor vinduet og starter på nytt når det er utløpt", async () => {
    vi.useFakeTimers();
    const l = new MinneLager();
    expect((await l.okn("k", 60)).antall).toBe(1);
    expect((await l.okn("k", 60)).antall).toBe(2);
    vi.advanceTimersByTime(61_000);
    expect((await l.okn("k", 60)).antall).toBe(1);
    vi.useRealTimers();
  });
});

describe("Upstash (REST-pipeline)", () => {
  it("sender SET NX + INCR + TTL og leser telleren", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify([{ result: "OK" }, { result: 3 }, { result: 3599 }]), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const l = new UpstashLager("https://eksempel.upstash.io/", "hemmelig-token");
    expect(await l.okn("artsorakel:test", 3600)).toEqual({ antall: 3, utloperOmSek: 3599 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://eksempel.upstash.io/pipeline");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer hemmelig-token");
    expect(JSON.parse(String(init?.body))).toEqual([
      ["SET", "artsorakel:test", "0", "EX", "3600", "NX"],
      ["INCR", "artsorakel:test"],
      ["TTL", "artsorakel:test"],
    ]);
  });

  it("kaster ved feil, og det robuste lageret faller tilbake til minne", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nede", { status: 503 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const upstash = new UpstashLager("https://eksempel.upstash.io", "t");
    await expect(upstash.okn("k", 60)).rejects.toThrow(/503/);
    const robust = new RobustLager(upstash, new MinneLager());
    expect((await robust.okn("k", 60)).antall).toBe(1);
    expect((await robust.okn("k", 60)).antall).toBe(2);
  });

  it("velger Upstash når miljøvariablene finnes (også Vercel-navnene KV_REST_API_*)", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://kv.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "t");
    _settLagerForTester(undefined);
    expect(tellerLager().navn).toBe("upstash");
  });

  it("bruker minne når Upstash ikke er satt opp", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    _settLagerForTester(undefined);
    expect(tellerLager().navn).toBe("minne");
  });
});

describe("bruksgrenser", () => {
  it("åpen app: 10 analyser per time per IP, som før", async () => {
    _settLagerForTester(new MinneLager());
    const regler = analyseRegler({ ipNokkel: "v4:1.2.3.4" });
    for (let i = 0; i < 10; i++) expect((await sjekkGrenser(regler)).ok).toBe(true);
    const r = await sjekkGrenser(regler);
    expect(r).toMatchObject({ ok: false, regel: "ip_time", maks: 10 });
  });

  it("med tilgangskode: grense per enhet, og høyere grense per IP for delt kontornett", () => {
    const regler = analyseRegler({ ipNokkel: "v4:1.2.3.4", sid: "enhet1" });
    expect(regler.map((r) => [r.navn, r.maks])).toEqual([
      ["enhet_time", 20],
      ["ip_time", 60],
    ]);
  });

  it("grensen kan justeres med miljøvariabel", () => {
    vi.stubEnv("ARTSORAKEL_ANALYSER_PER_TIME", "40");
    expect(analyseRegler({ ipNokkel: "x" })[0].maks).toBe(40);
    vi.stubEnv("ARTSORAKEL_ANALYSER_PER_TIME", "tull");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(analyseRegler({ ipNokkel: "x" })[0].maks).toBe(10);
  });

  it("døgnet følger norsk tid", () => {
    expect(osloDato(new Date("2026-11-04T23:30:00Z"))).toBe("2026-11-05");
    expect(sekunderTilMidnatt(new Date("2026-11-04T22:00:00Z"))).toBe(3600);
  });
});

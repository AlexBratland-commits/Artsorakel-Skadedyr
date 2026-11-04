import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LagerUtilgjengelig,
  LUA_OKN,
  LUA_RESERVER,
  MinneLager,
  UpstashLager,
  _settLagerForTester,
  tellerLager,
} from "@/lib/server/store";
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

describe("Upstash (REST, atomiske Lua-skript)", () => {
  it("øker telleren med ett udelt EVAL-skript og leser verdi og utløpstid", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ result: [3, 3599] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const l = new UpstashLager("https://eksempel.upstash.io/", "hemmelig-token");
    expect(await l.okn("artsorakel:test", 3600)).toEqual({ antall: 3, utloperOmSek: 3599 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://eksempel.upstash.io");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer hemmelig-token");
    expect(JSON.parse(String(init?.body))).toEqual(["EVAL", LUA_OKN, "1", "artsorakel:test", "3600", "1"]);
  });

  it("reservasjon sender grensen med og respekterer avslag", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ result: [0, 9_990_000] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const l = new UpstashLager("https://eksempel.upstash.io", "t");
    expect(await l.reserver("k", 20_000, 10_000_000, 3600)).toEqual({ ok: false, verdi: 9_990_000 });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual([
      "EVAL", LUA_RESERVER, "1", "k", "3600", "20000", "10000000",
    ]);
  });

  it("kaster LagerUtilgjengelig ved nedetid – ingen stille reserve i minnet", async () => {
    const fetchMock = vi.fn(async () => new Response("nede", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const upstash = new UpstashLager("https://eksempel.upstash.io", "t");
    await expect(upstash.okn("k", 60)).rejects.toBeInstanceOf(LagerUtilgjengelig);
    expect(fetchMock).toHaveBeenCalledTimes(2); // ett nytt forsøk ved 5xx
  });

  it("kaster ved nettverksfeil, tidsavbrudd og feilsvar fra Redis", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(new UpstashLager("https://x", "t").okn("k", 60)).rejects.toBeInstanceOf(LagerUtilgjengelig);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "WRONGPASS" }), { status: 401 })));
    await expect(new UpstashLager("https://x", "t").okn("k", 60)).rejects.toThrow(/401/);
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

describe("samtidighet i minnet (én prosess)", () => {
  it("50 samtidige økninger gir 50 ulike verdier", async () => {
    const l = new MinneLager();
    const verdier = await Promise.all(Array.from({ length: 50 }, () => l.okn("k", 60)));
    expect(new Set(verdier.map((v) => v.antall)).size).toBe(50);
  });

  it("30 samtidige reservasjoner mot plass til 10 gir nøyaktig 10", async () => {
    const l = new MinneLager();
    const r = await Promise.all(Array.from({ length: 30 }, () => l.reserver("k", 1, 10, 60)));
    expect(r.filter((x) => x.ok)).toHaveLength(10);
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

describe("ny chatgrense virker straks, uten å vente på at timekvoten utløper", () => {
  it("en teller som sto på 15 (over den gamle grensen 10) slipper gjennom med den nye grensen", async () => {
    const lager = new MinneLager();
    _settLagerForTester(lager);
    const { chatRegler, anonymIp } = await import("@/lib/server/limits");
    const nokkel = `artsorakel:chat:ip:${anonymIp("v4:9.9.9.9")}`;
    for (let i = 0; i < 15; i++) await lager.okn(nokkel, 3600);
    expect((await sjekkGrenser(chatRegler({ ipNokkel: "v4:9.9.9.9" }))).ok).toBe(true);
  });
});

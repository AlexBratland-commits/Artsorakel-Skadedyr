import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avregnKostnad, faktiskKostnad, reserverKostnad, type Reservasjon } from "@/lib/server/kostnad";
import { MinneLager, _settLagerForTester } from "@/lib/server/store";

let lager: MinneLager;
const brukt = async (r: Reservasjon) => (await lager.okn(r.nokkel, 3600, 0)).antall;

beforeEach(() => {
  lager = new MinneLager();
  _settLagerForTester(lager);
  vi.stubEnv("ARTSORAKEL_MAKS_KOSTNAD_PER_DOGN_USD", "0.10");
  vi.stubEnv("ARTSORAKEL_RESERVASJON_PER_AI_KALL_USD", "0.02");
  vi.stubEnv("ARTSORAKEL_PRIS_INN_USD_PER_MTOK", "");
  vi.stubEnv("ARTSORAKEL_PRIS_UT_USD_PER_MTOK", "");
});
afterEach(() => _settLagerForTester(undefined));

describe("kostnadsramme (reell kostnadskontroll)", () => {
  it("reserverer til rammen er full, og avslår deretter", async () => {
    const r = [];
    for (let i = 0; i < 6; i++) r.push(await reserverKostnad());
    expect(r.slice(0, 5).every((x) => x && x !== "av")).toBe(true);
    expect(r[5]).toBeNull();
  });

  it("faktisk kostnad fra OpenRouter erstatter reservasjonen og frigjør plass", async () => {
    const r = (await reserverKostnad()) as Reservasjon;
    expect(await brukt(r)).toBe(20_000);
    const a = await avregnKostnad(r, { type: "ok", forbruk: { kostnadUsd: 0.0015 } });
    expect(a).toEqual({ kilde: "openrouter", mikro: 1500 });
    expect(await brukt(r)).toBe(1500);
  });

  it("uten kostnad fra OpenRouter brukes priser fra miljøvariabler, hvis de er satt", async () => {
    vi.stubEnv("ARTSORAKEL_PRIS_INN_USD_PER_MTOK", "0,30");
    vi.stubEnv("ARTSORAKEL_PRIS_UT_USD_PER_MTOK", "2.50");
    expect(faktiskKostnad({ tokensInn: 10_000, tokensUt: 400 })).toEqual({ mikro: 4000, kilde: "beregnet" });
  });

  it("ukjent kostnad: reservasjonen beholdes (forsiktig anslag)", async () => {
    const r = (await reserverKostnad()) as Reservasjon;
    expect(await avregnKostnad(r, { type: "ok", forbruk: { tokensInn: 1000, tokensUt: 50 } })).toEqual({
      kilde: "reservert",
      mikro: 20_000,
    });
    await avregnKostnad(r, { type: "ukjent" });
    expect(await brukt(r)).toBe(20_000);
  });

  it("feilsvar fra OpenRouter faktureres ikke – reservasjonen frigis", async () => {
    const r = (await reserverKostnad()) as Reservasjon;
    await avregnKostnad(r, { type: "ikke_fakturert" });
    expect(await brukt(r)).toBe(0);
  });

  it("er av i evalueringsmodus (bare under next dev)", async () => {
    vi.stubEnv("EVAL_MODE", "1");
    vi.stubEnv("NODE_ENV", "development");
    expect(await reserverKostnad()).toBe("av");
  });
});

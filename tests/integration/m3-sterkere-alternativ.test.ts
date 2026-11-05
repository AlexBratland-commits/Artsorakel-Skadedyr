/**
 * M3 (revisjon): et alternativ med minst like høy sikkerhet som
 * hovedforslaget. PR #21 viste merknad og nivå i alternativlisten og PDF-en,
 * men chatten fikk ikke vite om det, historikken viste bare hovedforslagets
 * nivå, og sikkerhetsforklaringen sa ikke at bestemmelsen bør bekreftes.
 * Ingen prosenter vises, og arten byttes ikke automatisk.
 * Feilet på main 11c1442 og består etter rettelsen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrich } from "@/lib/identification";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { ALTERNATIV_MOTSTRID_TEKST, SIKKERHET_USIKKER_TILLEGG, historikkMerknad } from "@/lib/resultat-tekst";
import { installFakeAi } from "../helpers/fake-ai";
import { analyzeRequest, jpeg, jsonRequest } from "../helpers/requests";

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test");
  vi.stubEnv("ARTSORAKEL_TILGANGSKODE", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const ALT = { name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 90, hvorfor: "Kraftig hale" };
const motstrid = () => enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 85, alternativer: [ALT] }, "Gnagere");
const vanlig = () => enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 85, alternativer: [{ ...ALT, confidence: 40 }] }, "Gnagere");

describe("M3: alternativ minst like sannsynlig", () => {
  it("arten byttes ikke, og nivået er fortsatt Høy/Middels/Lav uten nye tall", () => {
    const r = motstrid();
    expect(r).toMatchObject({ found: true, name: "Husmus", confidence: 85 });
    expect(r.alternativer[0]).toMatchObject({ name: "Brunrotte", confidence: 90 });
  });

  it("PDF: sikkerhetsforklaringen og «kontakte fagfolk» sier at bestemmelsen bør bekreftes", () => {
    const i = lagRapportInnhold(motstrid(), { analyseTid: new Date() });
    expect(i.sikkerhet?.etikett).toBe("Høy sikkerhet");
    expect(i.sikkerhet?.forklaring).toContain(SIKKERHET_USIKKER_TILLEGG);
    expect(i.fagfolk).toContain(SIKKERHET_USIKKER_TILLEGG);
    expect(i.merknader).toContain(ALTERNATIV_MOTSTRID_TEKST);
    expect(JSON.stringify(i)).not.toMatch(/\d+ ?%/);
  });

  it("historikken markerer motstriden; vanlige funn uendret", () => {
    expect(historikkMerknad(motstrid())).toBe("Alternativ like sannsynlig");
    expect(historikkMerknad(vanlig())).toBeUndefined();
  });

  it("vanlig tilfelle uendret: ingen merknad eller tillegg", () => {
    const i = lagRapportInnhold(vanlig(), { analyseTid: new Date() });
    expect(i.sikkerhet?.forklaring).not.toContain(SIKKERHET_USIKKER_TILLEGG);
    expect(i.merknader).not.toContain(ALTERNATIV_MOTSTRID_TEKST);
  });
});

describe("M3: chatten får vite om motstriden", () => {
  async function system(species: Record<string, unknown>) {
    const ai = installFakeAi({ species: { found: true, name: "Husmus", latinName: "Mus musculus", description: "x", ...species } });
    vi.resetModules();
    const analyze = (await import("@/app/api/analyze/route")).POST;
    const chat = (await import("@/app/api/ask-about-findings/route")).POST;
    const r = await (await analyze(analyzeRequest({ image: await jpeg(Math.floor(Math.random() * 1e6)) }))).json();
    await chat(jsonRequest("/api/ask-about-findings", { chatToken: r.chatToken, messages: [{ role: "user", content: "Hva er det?" }] }));
    return ai.calls.find((c) => c.kind === "chat")!.system;
  }

  it("alternativ minst like sannsynlig: chatten skal ikke omtale hovedforslaget som sikkert eller velge selv", async () => {
    const s = await system({ confidence: 85, alternativer: [ALT] });
    expect(s).toContain("Et alternativ ble vurdert som minst like sannsynlig: Brunrotte (Rattus norvegicus)");
    expect(s).toMatch(/Omtal arten som usikker, og ikke velg mellom dem på egen hånd/);
    expect(s).not.toMatch(/Du kan bruke artsnavnet naturlig/);
  });

  // Rettelse etter gjennomgang av 6532725: instruksen må med uansett hovedforslagets nivå.
  const MOTSTRID_INSTRUKS = "Et alternativ ble vurdert som minst like sannsynlig: Brunrotte (Rattus norvegicus). Omtal arten som usikker, og ikke velg mellom dem på egen hånd.";
  for (const [nivaa, main, alt, egenRegel] of [
    ["lav («Mulig»)", 35, 40, /Omtal den alltid som «mulig Husmus»/],
    ["lav – like høy", 35, 35, /Omtal den alltid som «mulig Husmus»/],
    ["middels", 65, 70, /med middels sikkerhet\. Omtal arten som sannsynlig, ikke sikker/],
    ["middels – like høy", 65, 65, /med middels sikkerhet/],
    ["høy", 85, 90, /med høy sikkerhet/],
  ] as const) {
    it(`${nivaa}: instruksen om alternativet er med, og nivåets egen regel beholdes`, async () => {
      const s = await system({ confidence: main, alternativer: [{ ...ALT, confidence: alt }] });
      expect(s).toContain(MOTSTRID_INSTRUKS);
      expect(s).toMatch(egenRegel);
      expect(s).not.toMatch(/Du kan bruke artsnavnet naturlig/);
      expect(s.match(/minst like sannsynlig/g)).toHaveLength(1);
    });
  }

  for (const [nivaa, main, regel] of [
    ["lav", 35, /Omtal den alltid som «mulig Husmus»/],
    ["middels", 65, /med middels sikkerhet/],
  ] as const) {
    it(`${nivaa} uten konkurrerende alternativ: uendret`, async () => {
      const s = await system({ confidence: main, alternativer: [{ ...ALT, confidence: main - 5 }] });
      expect(s).toMatch(regel);
      expect(s).not.toMatch(/minst like sannsynlig/);
    });
  }

  it("vanlig høy sikkerhet med svakere alternativ: som før", async () => {
    const s = await system({ confidence: 85, alternativer: [{ ...ALT, confidence: 40 }] });
    expect(s).toMatch(/Du kan bruke artsnavnet naturlig/);
    expect(s).not.toMatch(/minst like sannsynlig/);
  });
});

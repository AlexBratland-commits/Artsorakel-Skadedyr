/**
 * H3 (revisjon): funn-chatten får usikkerhet, alternativer, motstrid og
 * «art utenfor listen» fra den signerte billetten, og systemprompten
 * – bevarer usikkerheten (aldri «bekreftet» ved «Mulig …»/lav sikkerhet),
 * – lar ikke modellen velge art ved motstridende navn,
 * – gir artsavhengige råd (tysk ≠ amerikansk kakerlakk), og
 * – gir ikke bekjempelsesråd for arter utenfor biblioteket, særlig markkakerlakk.
 * Falsk AI – systemprompten kontrolleres, ingen ekte AI-kall.
 * Feilet på main 6541875 og består etter rettelsen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPest } from "@/lib/pests";
import { installFakeAi } from "../helpers/fake-ai";
import { analyzeRequest, jpeg, jsonRequest } from "../helpers/requests";

async function ruter() {
  vi.resetModules();
  return {
    analyze: (await import("@/app/api/analyze/route")).POST,
    chat: (await import("@/app/api/ask-about-findings/route")).POST,
    signering: await import("@/lib/server/signing"),
  };
}

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

let seed = 500;

/** Analyserer med et bestemt AI-svar og stiller ett spørsmål. Returnerer systemprompten chatten fikk. */
async function systemFor(gruppe: string, species: Record<string, unknown>, sporsmal = "Hva bør jeg gjøre?") {
  const ai = installFakeAi({ group: { gruppe }, species: { description: "x", alternativer: [], ...species } });
  const { analyze, chat } = await ruter();
  const resultat = await (await analyze(analyzeRequest({ image: await jpeg(seed++) }))).json();
  const res = await chat(jsonRequest("/api/ask-about-findings", { chatToken: resultat.chatToken, messages: [{ role: "user", content: sporsmal }] }));
  expect(res.status).toBe(200);
  return { system: ai.calls.find((c) => c.kind === "chat")!.system, resultat };
}

const BEKREFTET_FORBUD = /Si aldri at arten er bekreftet/;
const tiltak = (art: string) => findPest(art)!.tiltak;

describe("H3: sikre forslag – artsnavnet brukes, men ikke som bekreftet", () => {
  it("tysk kakerlakk: artens egne råd om kartlegging og bekjempelse", async () => {
    const { system } = await systemFor("Kakerlakker", { found: true, name: "Tysk kakerlakk", latinName: "Blattella germanica", confidence: 90 });
    expect(system).toContain("Bildeanalysen foreslår Tysk kakerlakk (Blattella germanica) med høy sikkerhet");
    expect(system).toMatch(BEKREFTET_FORBUD);
    expect(system).not.toMatch(/Funnet er Tysk kakerlakk/);
    for (const t of tiltak("Tysk kakerlakk")) expect(system).toContain(t);
    expect(system).toMatch(/limfeller for å kartlegge/);
  });

  it("amerikansk kakerlakk: egne råd – ikke tysk kakerlakks", async () => {
    const { system } = await systemFor("Kakerlakker", { found: true, name: "Amerikansk kakerlakk", latinName: "Periplaneta americana", confidence: 90 });
    expect(system).toContain("Bildeanalysen foreslår Amerikansk kakerlakk (Periplaneta americana) med høy sikkerhet");
    for (const t of tiltak("Amerikansk kakerlakk")) expect(system).toContain(t);
    for (const t of tiltak("Tysk kakerlakk")) expect(system).not.toContain(t);
  });

  it("råd for arten, ikke generelle bekjempelsesråd for hele dyregruppen", async () => {
    const { system } = await systemFor("Kakerlakker", { found: true, name: "Tysk kakerlakk", latinName: "Blattella germanica", confidence: 90 });
    expect(system).toMatch(/Gi råd for akkurat denne arten – ikke generelle bekjempelsesråd for hele dyregruppen/);
  });

  it("lite alvorlig art: sier at bekjempelse sjelden trengs", async () => {
    const { system } = await systemFor("Biller", { found: true, name: "Museumsbille", latinName: "Anthrenus museorum", confidence: 90 });
    expect(system).toMatch(/Alvorlighet: lav \(Lite alvorlig – Sjelden behov for profesjonell hjelp\.\)/);
  });

  it("middels sikkerhet: omtales som sannsynlig, bør bekreftes", async () => {
    const { system } = await systemFor("Gnagere", { found: true, name: "Husmus", latinName: "Mus musculus", confidence: 65 });
    expect(system).toContain("Bildeanalysen foreslår Husmus (Mus musculus) med middels sikkerhet");
    expect(system).toMatch(/bør bekreftes av en fagperson/);
    expect(system).toMatch(BEKREFTET_FORBUD);
  });
});

describe("H3: usikre funn forblir usikre", () => {
  it("«Mulig Husmus» (lav sikkerhet): alltid «mulig», alternativene følger med", async () => {
    const { system } = await systemFor("Gnagere", {
      found: true, name: "Husmus", latinName: "Mus musculus", confidence: 35,
      alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 30, hvorfor: "Ung rotte" }],
    });
    expect(system).toContain("Bildeanalysen foreslår at det kan være Husmus (Mus musculus), men sikkerheten er lav");
    expect(system).toMatch(/Omtal den alltid som «mulig Husmus»/);
    expect(system).toMatch(BEKREFTET_FORBUD);
    expect(system).toContain("Andre mulige arter fra analysen: Brunrotte (Rattus norvegicus)");
    expect(system).not.toMatch(/Funnet er Husmus/);
  });

  it("generelt navn alene («Mus»): usikkert, med forklaring", async () => {
    const { system, resultat } = await systemFor("Gnagere", { found: true, name: "Mus", latinName: "", confidence: 95 });
    expect(resultat.usikkerKandidat).toBe(true);
    expect(system).toContain("men sikkerheten er lav");
    expect(system).toMatch(/AI-en brukte bare det generelle navnet «Mus»/);
  });

  it("motstridende artsnavn: chatten skal ikke velge art", async () => {
    const { system } = await systemFor("Gnagere", { found: true, name: "Klatremus", latinName: "Myodes rutilus", confidence: 90 });
    expect(system).toMatch(/motstridende artsnavn/);
    expect(system).toContain("Klatremus (Myodes glareolus)");
    expect(system).toContain("Rødmus (Myodes rutilus)");
    expect(system).toMatch(/Du skal ikke velge mellom dem/);
    expect(system).toMatch(BEKREFTET_FORBUD);
    expect(system).not.toMatch(/Bildeanalysen foreslår (Klatremus|Rødmus)/);
  });

  it("ukjent funn: ingen art", async () => {
    const { system } = await systemFor("Gnagere", { found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0 });
    expect(system).toMatch(/klarte ikke å bestemme arten/);
  });
});

describe("H3: art utenfor biblioteket – ingen automatiske bekjempelsesråd", () => {
  const markkakerlakk = [
    ["som «art utenfor listen»", { found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0, annenArt: { name: "Markkakerlakk", latinName: "Ectobius lapponicus", confidence: 85, hvorfor: "" } }],
    ["som «Kakerlakk» + Ectobius lapponicus", { found: true, name: "Kakerlakk", latinName: "Ectobius lapponicus", confidence: 92 }],
  ] as const;

  for (const [hvordan, svar] of markkakerlakk) {
    it(`markkakerlakk ${hvordan}: normalt ufarlig, ingen gift, limfeller eller profesjonell bekjempelse`, async () => {
      const { system } = await systemFor("Kakerlakker", svar);
      expect(system).toMatch(/utenfor Ocabs database/);
      expect(system).toContain("Ectobius lapponicus");
      expect(system).toMatch(/høy sikkerhet/);
      expect(system).toMatch(/Ikke anbefal bekjempelse, gift, limfeller eller profesjonell bekjempelse/);
      expect(system).toMatch(/Gjelder det markkakerlakk \(Ectobius lapponicus\), er den etter FHI ikke et skadedyr og skal ikke bekjempes/);
      expect(system).toMatch(/kan ikke formere seg innendørs/);
      for (const t of tiltak("Tysk kakerlakk")) expect(system).not.toContain(t);
      expect(system).not.toMatch(/Bildeanalysen foreslår (Tysk|Amerikansk)/);
    });
  }

  it("annen art utenfor listen (ikke markkakerlakk): samme forsiktighet, uten markkakerlakk-regelen", async () => {
    const { system } = await systemFor("Andre pattedyr", {
      found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0,
      annenArt: { name: "Hare", latinName: "Lepus timidus", confidence: 70, hvorfor: "" },
    });
    expect(system).toMatch(/«Hare» \(Lepus timidus\).*utenfor Ocabs database/);
    expect(system).toMatch(/Ikke anbefal bekjempelse, gift, limfeller eller profesjonell bekjempelse/);
    expect(system).not.toMatch(/Markkakerlakk/);
  });
});

describe("H3: billetten", () => {
  it("klienten kan ikke endre sikkerhet eller art – bare den signerte billetten teller", async () => {
    const ai = installFakeAi({ group: { gruppe: "Gnagere" }, species: { found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 35, alternativer: [] } });
    const { analyze, chat } = await ruter();
    const r = await (await analyze(analyzeRequest({ image: await jpeg(seed++) }))).json();
    await chat(jsonRequest("/api/ask-about-findings", { chatToken: r.chatToken, confidence: 99, nivaa: "høy", art: "Veggedyr", messages: [{ role: "user", content: "Hei" }] }));
    const system = ai.calls.find((c) => c.kind === "chat")!.system;
    expect(system).toContain("sikkerheten er lav");
    expect(system).not.toContain("Veggedyr");
  });

  it("eldre billett uten sikkerhet: arten omtales som forslag med ukjent sikkerhet, aldri som bekreftet", async () => {
    const ai = installFakeAi();
    const { chat, signering } = await ruter();
    const gammel = signering.signer({ v: 1, id: "gammel-billett", exp: Date.now() + 60_000, art: "Husmus", gruppe: "Gnagere" }, "chat-billett");
    const res = await chat(jsonRequest("/api/ask-about-findings", { chatToken: gammel, messages: [{ role: "user", content: "Hei" }] }));
    expect(res.status).toBe(200);
    const system = ai.calls.find((c) => c.kind === "chat")!.system;
    expect(system).toContain("Bildeanalysen foreslår Husmus (Mus musculus)");
    expect(system).toMatch(BEKREFTET_FORBUD);
  });
});

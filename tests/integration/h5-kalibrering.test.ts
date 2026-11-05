/**
 * H5 (revisjon): sikkerhetsnivået skal ikke være høyere enn grunnlaget.
 *
 * Modellens confidence er ikke en kalibrert sannsynlighet. Reglene her
 * innfører derfor ingen nye prosenter: de sørger bare for at modellens EGEN
 * beskrivelse av bildegrunnlaget («tydelig», «delvis», «uklart») og kjente
 * mangler (ekskrementer uten oppgitt størrelse) ikke kan vises som et høyere
 * nivå enn det grunnlaget tillater. Grensene er de eksisterende
 * nivågrensene (Lav < 50 ≤ Middels < 80 ≤ Høy).
 *
 * Falsk AI – testene viser at reglene virker på svarene, ikke at modellen
 * vurderer bildene riktig. Feilet på main 1ad3fd3 og består etter endringen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrich, markerIkkeSkadedyr } from "@/lib/identification";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import {
  feilmeldingTekst,
  harSterkereAlternativ,
  sikkerhetsbegrensninger,
  visningsSikkerhet,
  visningsnavn,
} from "@/lib/resultat-tekst";
import { sikkerhetsnivaa, type AnalysisResult } from "@/lib/types";
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

const nivaa = (r: AnalysisResult) => sikkerhetsnivaa(r.confidence);
const dyr = (raw: Record<string, unknown>, gruppe: Parameters<typeof enrich>[1] = "Gnagere", kontekst?: Parameters<typeof enrich>[2]) =>
  enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "x", alternativer: [], ...raw }, gruppe, kontekst);

describe("H5 A: bildegrunnlaget begrenser nivået", () => {
  it("1. tydelig bilde med gode kjennetegn: modellens nivå beholdes (Høy)", () => {
    const r = dyr({ confidence: 92, grunnlag: "tydelig" });
    expect(nivaa(r)).toBe("høy");
    expect(r.confidence).toBe(92);
    expect(sikkerhetsbegrensninger(r)).toEqual([]);
    expect(visningsnavn(r)).toBe("Husmus");
  });

  it("2. uklart bilde: aldri over Lav – arten beholdes som «Mulig», ikke byttet eller fjernet", () => {
    const r = dyr({ confidence: 95, grunnlag: "uklart" });
    expect(r.found).toBe(true);
    expect(r.name).toBe("Husmus");
    expect(nivaa(r)).toBe("lav");
    expect(visningsnavn(r)).toBe("Mulig Husmus");
    expect(sikkerhetsbegrensninger(r).join(" ")).toMatch(/uklart/);
  });

  it("3. delvis skjult dyr: aldri over Middels; lavere nivå heves ikke", () => {
    const r = dyr({ confidence: 90, grunnlag: "delvis" });
    expect(nivaa(r)).toBe("middels");
    expect(sikkerhetsbegrensninger(r).join(" ")).toMatch(/kjennetegnene .* synes/);
    const lav = dyr({ confidence: 40, grunnlag: "delvis" });
    expect(lav.confidence).toBe(40);
    expect(sikkerhetsbegrensninger(lav)).toEqual([]);
  });

  it("ukjent eller manglende «grunnlag» gir ingen begrensning (bakoverkompatibelt), og store/små bokstaver tolkes likt", () => {
    expect(nivaa(dyr({ confidence: 90 }))).toBe("høy");
    expect(nivaa(dyr({ confidence: 90, grunnlag: "kanskje" }))).toBe("høy");
    expect(nivaa(dyr({ confidence: 90, grunnlag: " UKLART " }))).toBe("lav");
  });
});

describe("H5 B: visuelt like arter", () => {
  it("4. pelsbille der kjennetegnene bare delvis synes: Middels, og modellens rangering av alternativet beholdes", () => {
    const r = dyr(
      {
        name: "Pelsbille", latinName: "Attagenus pellio", confidence: 92, grunnlag: "delvis",
        alternativer: [{ name: "Brun pelsbille", latinName: "Attagenus smirnovi", confidence: 85, hvorfor: "Larve" }],
      },
      "Biller"
    );
    expect(r.name).toBe("Pelsbille");
    expect(nivaa(r)).toBe("middels");
    // Begrensningen lager ikke en kunstig «like sannsynlig»-motstrid (M3)
    expect(r.alternativer[0].confidence).toBeLessThan(r.confidence);
    expect(harSterkereAlternativ(r)).toBe(false);
  });

  it("markkakerlakk mot tysk kakerlakk med uklart bilde: Lav, tysk kakerlakk beholdes som alternativ", () => {
    const r = dyr(
      {
        name: "Markkakerlakk", latinName: "Ectobius lapponicus", confidence: 88, grunnlag: "uklart",
        alternativer: [{ name: "Tysk kakerlakk", latinName: "Blattella germanica", confidence: 60, hvorfor: "Halsskjoldet synes ikke" }],
      },
      "Kakerlakker"
    );
    expect(visningsnavn(r)).toBe("Mulig Markkakerlakk");
    expect(r.alternativer.map((a) => a.name)).toEqual(["Tysk kakerlakk"]);
    expect(r.alternativer[0].confidence).toBeLessThan(r.confidence);
  });
});

describe("H5 D: konkurrerende forslag (M3 beholdes)", () => {
  it("5. like sterkt alternativ: fortsatt markert, også når nivået er begrenset", () => {
    const like = dyr({ confidence: 85, alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 85, hvorfor: "" }] });
    expect(harSterkereAlternativ(like)).toBe(true);
    const begrenset = dyr({ confidence: 85, grunnlag: "delvis", alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 85, hvorfor: "" }] });
    expect(harSterkereAlternativ(begrenset)).toBe(true);
  });

  it("6. sterkere alternativ: markert, og arten byttes ikke", () => {
    const r = dyr({ confidence: 70, grunnlag: "uklart", alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 90, hvorfor: "" }] });
    expect(r.name).toBe("Husmus");
    expect(harSterkereAlternativ(r)).toBe(true);
    expect(r.alternativer[0].confidence).toBeLessThanOrEqual(49);
  });
});

describe("H5 C: ekskrementer", () => {
  const ekskrement = (raw: Record<string, unknown>, kontekst?: Parameters<typeof enrich>[2]) =>
    enrich({ found: true, name: "Mus", latinName: "Mus musculus", description: "x", alternativer: [], ...raw }, "Ekskrementer", kontekst);

  it("7. uten oppgitt størrelse: ikke Høy (størrelsen kan ikke måles på et bilde)", () => {
    const r = ekskrement({ confidence: 92, grunnlag: "tydelig" }, { storrelseOppgitt: false });
    expect(nivaa(r)).toBe("middels");
    expect(sikkerhetsbegrensninger(r).join(" ")).toMatch(/Størrelsen er ikke oppgitt/);
  });

  it("med oppgitt størrelse (valg eller mål i beskrivelsen) beholdes nivået", () => {
    expect(nivaa(ekskrement({ confidence: 92 }, { storrelseOppgitt: true }))).toBe("høy");
  });

  it("8. art kan ikke bestemmes: «Kunne ikke identifisere», typen beholdes", () => {
    const r = ekskrement({ found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0 }, { storrelseOppgitt: false });
    expect(r.found).toBe(false);
    expect(r.gruppe).toBe("Ekskrementer");
    expect(visningsSikkerhet(r)).toBeUndefined();
  });

  it("ekskrementanalysen via API: størrelsesvalg og mål i beskrivelsen teller som oppgitt størrelse", async () => {
    const tilfeller: [Record<string, string>, string][] = [
      [{}, "middels"],
      [{ droppingSize: "3-6mm" }, "høy"],
      [{ beskrivelse: "Ca 5 mm lange, spisse" }, "høy"],
      [{ beskrivelse: "Spisse, i skuffen" }, "middels"],
    ];
    for (const [felt, forventet] of tilfeller) {
      installFakeAi({ species: { found: true, name: "Mus", latinName: "Mus musculus", description: "x", confidence: 90, grunnlag: "tydelig", alternativer: [] } });
      vi.resetModules();
      const analyze = (await import("@/app/api/analyze/route")).POST;
      const r = await (await analyze(analyzeRequest({ image: await jpeg(Math.floor(Math.random() * 1e6)), fields: { type: "ekskrementer", ...felt } }))).json();
      expect(sikkerhetsnivaa(r.confidence), JSON.stringify(felt)).toBe(forventet);
    }
  });
});

describe("H5 E: ukjent art", () => {
  it("9. art utenfor biblioteket med uklart bilde: Lav, ikke presset inn i biblioteket", () => {
    const r = dyr({
      found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0, grunnlag: "uklart",
      annenArt: { name: "Hare", latinName: "Lepus timidus", confidence: 90, hvorfor: "" },
    }, "Andre pattedyr");
    expect(r.found).toBe(false);
    expect(r.annenArt?.name).toBe("Hare");
    expect(visningsSikkerhet(r)?.etikett).toBe("Lav sikkerhet");
  });

  it("ingen art passer: svaret er «Kunne ikke identifisere», ikke en art fra biblioteket", () => {
    const r = markerIkkeSkadedyr(dyr({ found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0 }), "Gnagere");
    expect(r.found).toBe(false);
    expect(visningsnavn(r)).toBe("Kunne ikke identifisere funnet sikkert");
  });
});

describe("H5: manglende eller ugyldig confidence", () => {
  it("10. mangler eller er uleselig: Lav («Mulig»), aldri Høy; negativ: ukjent; over 100: høyst 100", () => {
    for (const verdi of [undefined, null, "", "høy", "veldig sikker", Number.NaN, {}, []]) {
      const r = dyr({ confidence: verdi });
      expect(r.found, String(verdi)).toBe(true);
      expect(nivaa(r), String(verdi)).toBe("lav");
      expect(visningsnavn(r)).toBe("Mulig Husmus");
    }
    expect(dyr({ confidence: -5 }).found).toBe(false);
    expect(dyr({ confidence: 150 }).confidence).toBe(100);
    expect(nivaa(dyr({ confidence: 150, grunnlag: "uklart" }))).toBe("lav");
    expect(dyr({ confidence: "85 %" }).confidence).toBe(85);
  });
});

describe("H5: samme nivå i analyse, chat, historikk og PDF", () => {
  it("11. uklart bilde: Lav overalt, med forklaring på skjermen/PDF og i chatten", async () => {
    const ai = installFakeAi({ species: { found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 95, grunnlag: "uklart", alternativer: [] } });
    vi.resetModules();
    const analyze = (await import("@/app/api/analyze/route")).POST;
    const chat = (await import("@/app/api/ask-about-findings/route")).POST;
    const r: AnalysisResult = await (await analyze(analyzeRequest({ image: await jpeg(Math.floor(Math.random() * 1e6)) }))).json();
    expect(nivaa(r)).toBe("lav");
    expect(visningsSikkerhet(r)?.etikett).toBe("Lav sikkerhet"); // historikk bruker samme funksjon
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.sikkerhet?.etikett).toBe("Lav sikkerhet");
    expect(i.navn).toBe("Mulig Husmus");
    expect(i.merknader.join(" ")).toMatch(/Bildet er uklart/);
    expect(feilmeldingTekst(r)).toMatch(/lav sikkerhet/);
    await chat(jsonRequest("/api/ask-about-findings", { chatToken: r.chatToken, messages: [{ role: "user", content: "Er det sikkert?" }] }));
    const system = ai.calls.find((c) => c.kind === "chat")!.system;
    expect(system).toContain("men sikkerheten er lav");
    expect(system).toMatch(/Bildet er uklart/);
  });

  it("systemprompten ber om bildegrunnlaget, og confidence for ekskrementer gjelder hvilket dyr", async () => {
    const ai = installFakeAi();
    vi.resetModules();
    const analyze = (await import("@/app/api/analyze/route")).POST;
    await analyze(analyzeRequest({ image: await jpeg(Math.floor(Math.random() * 1e6)) }));
    await analyze(analyzeRequest({ image: await jpeg(Math.floor(Math.random() * 1e6)), fields: { type: "ekskrementer" } }));
    const art = ai.calls.filter((c) => c.kind === "species");
    for (const k of art) {
      expect(k.system).toMatch(/"grunnlag":"tydelig\|delvis\|uklart"/);
      expect(k.system).toMatch(/kjennetegnene som skiller arten fra forvekslingsartene/);
    }
    expect(art.at(-1)!.system).toMatch(/confidence gjelder hvilket dyr ekskrementene stammer fra/);
    expect(art.at(-1)!.system).toMatch(/Oppgi ikke mål i millimeter som om de var målt/);
  });
});

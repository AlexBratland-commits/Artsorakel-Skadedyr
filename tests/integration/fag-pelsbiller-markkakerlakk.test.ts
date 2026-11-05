/**
 * Faglig gjennomgang: pelsbiller (og beslektede klannere) og markkakerlakk.
 * Kilde: FHI felthåndbok 2023 (s. 19–20 kakerlakker, s. 24 fleskeklanner,
 * s. 26–27 pelsbiller, s. 30 museumsbille) og FHIs skadedyrhåndbok.
 *
 * Falsk AI – testene kontrollerer artsbiblioteket, oppslag, råd, chat-
 * instrukser og PDF-innhold. De viser ikke at den ekte modellen
 * artsbestemmer riktig fra fotografier.
 * Feilet på main 183d6d1 og består etter endringen.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enrich, parseAlternatives } from "@/lib/identification";
import { findPest, fhiUrl, type PestGroup } from "@/lib/pests";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { visningsnavn } from "@/lib/resultat-tekst";
import { relevanteArter } from "@/lib/server/assistent";
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

const svar = (raw: Record<string, unknown>, gruppe: PestGroup) =>
  enrich({ description: "x", alternativer: [], found: true, confidence: 90, ...raw }, gruppe);

/** Råd som hører til bekjempelse av etablerte kakerlakkangrep, ikke markkakerlakk. */
const KJEMISK = /åte|insektmid|gift|sprøyt|skadedyrbekjemper|limfelle|sanering|hele bygningen|meld fra til huseier/i;

describe("Pelsbiller: navn og oppslag", () => {
  it("1. Attagenus smirnovi gir brun pelsbille – også via «majorstubille»", () => {
    for (const [navn, latin] of [["Brun pelsbille", "Attagenus smirnovi"], ["", "Attagenus smirnovi"], ["Majorstubille", ""]]) {
      expect(svar({ name: navn, latinName: latin }, "Biller"), `${navn}/${latin}`).toMatchObject({ found: true, name: "Brun pelsbille", latinName: "Attagenus smirnovi" });
    }
  });

  it("2. Attagenus pellio gir pelsbille", () => {
    for (const [navn, latin] of [["Pelsbille", "Attagenus pellio"], ["", "Attagenus pellio"], ["Pelsbille", ""]]) {
      expect(svar({ name: navn, latinName: latin }, "Biller"), `${navn}/${latin}`).toMatchObject({ found: true, name: "Pelsbille", latinName: "Attagenus pellio" });
    }
  });

  it("3. de to blandes ikke: motstridende navn velger ingen, og aliasene er adskilt", () => {
    for (const [navn, latin] of [["Brun pelsbille", "Attagenus pellio"], ["Pelsbille", "Attagenus smirnovi"], ["Majorstubille", "Attagenus pellio"]]) {
      const r = svar({ name: navn, latinName: latin }, "Biller");
      expect(r.found, `${navn}/${latin}`).toBe(false);
      expect(r.motstrid).toBeDefined();
    }
    expect(findPest("Brun pelsbille")!.aliaser ?? []).not.toContain("pelsbille");
    expect(findPest("Pelsbille")!.aliaser ?? []).not.toContain("majorstubille");
  });

  it("egne FHI-lenker for hver pelsbille", () => {
    expect(fhiUrl(findPest("Brun pelsbille")!.slug)).toBe("https://www.fhi.no/sk/skadedyrhandboka/biller/brun-pelsbille/");
    expect(fhiUrl(findPest("Pelsbille")!.slug)).toBe("https://www.fhi.no/sk/skadedyrhandboka/biller/pelsbille/");
    expect(fhiUrl(findPest("Museumsbille")!.slug)).toBe("https://www.fhi.no/sk/skadedyrhandboka/biller/museumsbille/");
  });
});

describe("Pelsbiller: kjennetegn og råd etter FHI", () => {
  it("brun pelsbille: voksen og larve beskrevet hver for seg, funnsteder og skade", () => {
    const p = findPest("Brun pelsbille")!;
    expect(p.kjennetegn).toMatch(/Voksen: 2–5 mm.*brune dekkvinger og svart halsskjold/);
    expect(p.kjennetegn).toMatch(/Larve: brun og hårete, opptil 8 mm, med lang haledusk/);
    expect(p.forklaring).toMatch(/larve alene gir ikke en sikker bestemmelse/);
    expect(p.utbredelse).toMatch(/formerer seg bare innendørs/i);
    expect(p.sesong).toMatch(/hele året/);
    const raad = p.tiltak.join(" ");
    expect(raad).toMatch(/Én bille/);
    expect(raad).toMatch(/sprekker i gulvplanker, langs listverk og under komfyr og kjøleskap/);
    expect(raad).toMatch(/fryses eller varmebehandles/);
    expect(raad).toMatch(/pels, skinn, fjær og ull/);
    expect(raad).not.toMatch(/insektmid|sprøyt/i);
  });

  // FHIs nettside (https://www.fhi.no/sk/skadedyrhandboka/biller/pelsbille/), kontrollert av fagansvarlig
  it("pelsbille: 3,5–5,5 mm, larve opptil 10 mm; varme 60 °C der materialet tåler det, frysing mulig med forbehold", () => {
    const p = findPest("Pelsbille")!;
    expect(p.kjennetegn).toMatch(/Voksen: 3,5–5,5 mm, svart/);
    expect(p.kjennetegn).toMatch(/Larve: brun og hårete, opptil 10 mm/);
    const raad = p.tiltak.join(" ");
    expect(raad).toMatch(/Én voksen bille kan ha fløyet inn utenfra/);
    expect(raad).toMatch(/60 °C der materialet tåler det/);
    expect(raad).toMatch(/Frysing kan også brukes, men arten tåler lave temperaturer godt, og en vanlig hjemmefryser gir ikke alltid god nok effekt/);
    expect(raad).not.toMatch(/ikke frys|frysing (er )?uaktuel|frysing virker ikke/i);
  });

  it("frysing: ingen motstridende råd mellom pelsbillene og museumsbille – hver art etter sin kuldetoleranse", () => {
    const raad = (art: string) => findPest(art)!.tiltak.join(" ");
    // Brun pelsbille: frysing eller varme (FHI)
    expect(raad("Brun pelsbille")).toMatch(/fryses eller varmebehandles/);
    // Pelsbille: varme først, frysing mulig med forbehold om at arten tåler kulde
    expect(raad("Pelsbille")).toMatch(/varme.*60 °C.*Frysing kan også brukes, men arten tåler lave temperaturer godt/);
    // Museumsbille: varme – billene tåler kulde (FHI felthåndbok)
    expect(raad("Museumsbille")).toMatch(/60 °C.*billene tåler kulde/);
    expect(raad("Museumsbille")).not.toMatch(/frys/i);
    // Ingen av dem sier at frysing er uaktuelt
    for (const art of ["Brun pelsbille", "Pelsbille", "Museumsbille"]) expect(raad(art), art).not.toMatch(/frysing (er )?uaktuel|ikke frys/i);
  });

  it("museumsbille: FHI-kjennetegn, nord til Nordland, varme – ikke frysing", () => {
    const p = findPest("Museumsbille")!;
    expect(p.kjennetegn).toMatch(/2–4 mm/);
    expect(p.kjennetegn).toMatch(/svart med små skjell i svart, hvitt og oker/);
    expect(p.kjennetegn).toMatch(/pæreformet/);
    expect(p.utbredelse).toMatch(/nord til Nordland/);
    expect(p.tiltak.join(" ")).not.toMatch(/frys/i);
    expect(p.tiltak.join(" ")).toMatch(/60 °C/);
    expect(p.tiltak.join(" ")).toMatch(/gjør som regel ingen skade/);
  });

  it("fleskeklanner: larve opptil 13 mm, enkeltindivider tolereres", () => {
    const p = findPest("Fleskeklanner")!;
    expect(p.kjennetegn).toMatch(/opptil 13 mm/);
    expect(p.tiltak.join(" ")).toMatch(/Enkeltindivider må tolereres/);
  });

  it("ingen beskriver lenger brun pelsbille som «ensfarget brun»", () => {
    for (const art of ["Museumsbille", "Tepperbille", "Fleskeklanner"]) {
      expect((findPest(art)!.forveksles ?? []).join(" "), art).not.toMatch(/ensfarget brun/);
    }
  });
});

describe("Markkakerlakk og tysk kakerlakk", () => {
  it("4. markkakerlakk kobles til Ectobius lapponicus", () => {
    expect(findPest("Markkakerlakk")).toMatchObject({ latin: "Ectobius lapponicus", gruppe: "Kakerlakker", alvorlighet: "lav" });
    expect(findPest("Ectobius lapponicus")?.norsk).toBe("Markkakerlakk");
    for (const [navn, latin] of [["Markkakerlakk", "Ectobius lapponicus"], ["", "Ectobius lapponicus"], ["Kakerlakk", "Ectobius lapponicus"], ["Markkakerlakk", ""]]) {
      expect(svar({ name: navn, latinName: latin }, "Kakerlakker"), `${navn}/${latin}`).toMatchObject({ found: true, name: "Markkakerlakk", latinName: "Ectobius lapponicus" });
    }
    expect(fhiUrl(findPest("Markkakerlakk")!.slug)).toBe("https://www.fhi.no/sk/skadedyrhandboka/kakerlakker/markkakerlakk/");
  });

  it("5. tysk kakerlakk kobles til Blattella germanica", () => {
    expect(svar({ name: "Tysk kakerlakk", latinName: "Blattella germanica" }, "Kakerlakker")).toMatchObject({ found: true, name: "Tysk kakerlakk" });
    expect(svar({ name: "", latinName: "Blattella germanica" }, "Kakerlakker").name).toBe("Tysk kakerlakk");
    expect(fhiUrl(findPest("Tysk kakerlakk")!.slug)).toBe("https://www.fhi.no/sk/skadedyrhandboka/kakerlakker/tysk-kakerlakk/");
  });

  it("6. markkakerlakk får ikke råd om kjemisk bekjempelse, men om å fjerne enkeltdyr og begrense innvandring", () => {
    const p = findPest("Markkakerlakk")!;
    const raad = p.tiltak.join(" ");
    expect(raad).toMatch(/ikke et skadedyr og skal ikke bekjempes/);
    expect(raad).toMatch(/Enkeltdyr kan fjernes/);
    expect(raad).toMatch(/begrense/);
    expect(raad).toMatch(/Ikke bruk kakerlakkåte eller insektmidler/);
    // Bare den uttrykkelige advarselen mot slike midler – ingen anbefaling av dem
    expect(p.tiltak.filter((t) => KJEMISK.test(t))).toEqual([expect.stringMatching(/^Ikke bruk kakerlakkåte eller insektmidler/)]);
    expect(p.notat).toMatch(/ikke et skadedyr/);
    expect(p.utbredelse).toMatch(/tregrensen/);
    expect(p.sesong).toMatch(/kan ikke formere seg innendørs/);
    for (const t of findPest("Tysk kakerlakk")!.tiltak) expect(p.tiltak).not.toContain(t);
  });

  it("7. tysk kakerlakk beholder sine bekjempelsesråd og kan forveksles med markkakerlakk", () => {
    const p = findPest("Tysk kakerlakk")!;
    expect(p.alvorlighet).toBe("høy");
    expect(p.tiltak.join(" ")).toMatch(/limfeller for å kartlegge/);
    expect(p.tiltak.join(" ")).toMatch(/Ikke sprøyt selv/);
    expect((p.forveksles ?? []).join(" ")).toMatch(/Markkakerlakk – .*dagaktiv/);
  });

  it("8. andre Ectobius-arter blir ikke markkakerlakk", () => {
    for (const latin of ["Ectobius sylvestris", "Ectobius sp.", "Ectobius"]) {
      const r = svar({ name: "Kakerlakk", latinName: latin }, "Kakerlakker");
      expect(r.name, latin).not.toBe("Markkakerlakk");
      expect(r.found).toBe(false);
      expect(r.annenArt?.latinName).toBe(latin);
    }
    expect(parseAlternatives([{ name: "Kakerlakk", latinName: "Ectobius sylvestris", confidence: 40, hvorfor: "" }], "Kakerlakker")).toEqual([]);
  });

  it("9. usikker bestemmelse: «Mulig Markkakerlakk», og tysk kakerlakk kan følge med som alternativ", () => {
    const r = svar(
      { name: "Markkakerlakk", latinName: "Ectobius lapponicus", confidence: 40, alternativer: [{ name: "Tysk kakerlakk", latinName: "Blattella germanica", confidence: 35, hvorfor: "Striper?" }] },
      "Kakerlakker"
    );
    expect(visningsnavn(r)).toBe("Mulig Markkakerlakk");
    expect(r.alternativer[0].name).toBe("Tysk kakerlakk");
    expect(r.tiltak.join(" ")).toMatch(/få arten bestemt før du gjør tiltak/);
  });
});

describe("10. Chat og PDF beholder art og tiltak", () => {
  async function chatSystem(species: Record<string, unknown>) {
    const ai = installFakeAi({ group: { gruppe: "Kakerlakker" }, species: { description: "x", alternativer: [], found: true, confidence: 90, ...species } });
    vi.resetModules();
    const analyze = (await import("@/app/api/analyze/route")).POST;
    const chat = (await import("@/app/api/ask-about-findings/route")).POST;
    const r = await (await analyze(analyzeRequest({ image: await jpeg(Math.floor(Math.random() * 1e6)) }))).json();
    await chat(jsonRequest("/api/ask-about-findings", { chatToken: r.chatToken, messages: [{ role: "user", content: "Hva gjør jeg?" }] }));
    return { system: ai.calls.find((c) => c.kind === "chat")!.system, resultat: r };
  }

  it("markkakerlakk: chatten får markkakerlakkens råd og ikke tysk kakerlakks", async () => {
    const { system } = await chatSystem({ name: "Markkakerlakk", latinName: "Ectobius lapponicus" });
    expect(system).toContain("Bildeanalysen foreslår Markkakerlakk (Ectobius lapponicus) med høy sikkerhet");
    expect(system).toMatch(/ikke et skadedyr og skal ikke bekjempes/);
    for (const t of findPest("Tysk kakerlakk")!.tiltak) expect(system).not.toContain(t);
  });

  it("tysk kakerlakk: chatten får tysk kakerlakks råd", async () => {
    const { system } = await chatSystem({ name: "Tysk kakerlakk", latinName: "Blattella germanica" });
    for (const t of findPest("Tysk kakerlakk")!.tiltak) expect(system).toContain(t);
    for (const t of findPest("Markkakerlakk")!.tiltak) expect(system).not.toContain(t);
  });

  it("PDF: markkakerlakk med egne råd, «Lite alvorlig», FHI-kilde og uten tysk kakerlakks råd", () => {
    const r = svar({ name: "Markkakerlakk", latinName: "Ectobius lapponicus" }, "Kakerlakker");
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.navn).toBe("Markkakerlakk");
    expect(i.latin).toBe("Ectobius lapponicus");
    expect(i.risiko.etikett).toBe("Lite alvorlig");
    expect(i.tiltak).toEqual(findPest("Markkakerlakk")!.tiltak);
    expect(i.kilde).toBe("https://www.fhi.no/sk/skadedyrhandboka/kakerlakker/markkakerlakk/");
  });

  it("PDF: brun pelsbille og pelsbille holder hver sine råd", () => {
    const brun = lagRapportInnhold(svar({ name: "Brun pelsbille", latinName: "Attagenus smirnovi" }, "Biller"), { analyseTid: new Date() });
    const pels = lagRapportInnhold(svar({ name: "Pelsbille", latinName: "Attagenus pellio" }, "Biller"), { analyseTid: new Date() });
    expect(brun.tiltak).toEqual(findPest("Brun pelsbille")!.tiltak);
    expect(pels.tiltak).toEqual(findPest("Pelsbille")!.tiltak);
    expect(brun.latin).toBe("Attagenus smirnovi");
    expect(pels.latin).toBe("Attagenus pellio");
  });
});

describe("Spør Artsorakel: artsbiblioteket i den generelle chatten", () => {
  it("«kakerlakk» gir både tysk kakerlakk og markkakerlakk som fagstoff", () => {
    const arter = relevanteArter("Jeg fant en kakerlakk i stua i dag").map((p) => p.norsk);
    expect(arter).toContain("Tysk kakerlakk");
    expect(arter).toContain("Markkakerlakk");
  });

  it("«markkakerlakk» og «pelsbille» gir riktig art", () => {
    expect(relevanteArter("Er markkakerlakk farlig?").map((p) => p.norsk)).toContain("Markkakerlakk");
    const pels = relevanteArter("Jeg har funnet en pelsbille").map((p) => p.norsk);
    expect(pels).toContain("Pelsbille");
    expect(pels).not.toContain("Brun pelsbille");
    expect(relevanteArter("Majorstubille i leiligheten").map((p) => p.norsk)).toContain("Brun pelsbille");
  });
});

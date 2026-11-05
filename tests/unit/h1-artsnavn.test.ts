/**
 * H1 (revisjon): feilaktige aliaser og motstridende artsnavn.
 * - Pelsbille (Attagenus pellio) og rødmus (Myodes rutilus) er egne arter,
 *   ikke aliaser for brun pelsbille og klatremus (FHI felthåndbok 2023 s. 25 og 119).
 * - «anthrenus» (slekt med to arter i biblioteket) og «hundelopp»/«loppe»
 *   peker ikke lenger på én art.
 * - Peker norsk og vitenskapelig navn på forskjellige arter, blir resultatet
 *   usikkert og motstridende – appen velger ikke selv.
 * - «Art utenfor listen» gjøres ikke om til en art i biblioteket via et alias.
 * Feilet på main 02e2c3b og består etter rettelsen.
 */
import { describe, expect, it } from "vitest";
import { enrich, markerIkkeSkadedyr, parseAlternatives } from "@/lib/identification";
import { PESTS, findPest, findPestInGroup, type PestGroup } from "@/lib/pests";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { IKKE_IDENTIFISERT, motstridTekst, oppryddingFor, visningsnavn } from "@/lib/resultat-tekst";

const svar = (raw: Record<string, unknown>, gruppe: PestGroup | null) =>
  enrich({ description: "x", alternativer: [], found: true, confidence: 90, ...raw }, gruppe);

describe("H1: aliaser", () => {
  it("pelsbille er en egen art (Attagenus pellio), ikke brun pelsbille", () => {
    expect(findPest("Pelsbille")).toMatchObject({ norsk: "Pelsbille", latin: "Attagenus pellio", gruppe: "Biller" });
    expect(findPest("Attagenus pellio")?.norsk).toBe("Pelsbille");
    for (const n of ["Brun pelsbille", "Attagenus smirnovi", "majorstubille"]) expect(findPest(n)?.latin, n).toBe("Attagenus smirnovi");
    expect(findPest("Brun pelsbille")!.aliaser ?? []).not.toEqual(expect.arrayContaining(["pelsbille"]));
  });

  it("rødmus er en egen art (Myodes rutilus), ikke klatremus", () => {
    expect(findPest("Rødmus")).toMatchObject({ norsk: "Rødmus", latin: "Myodes rutilus", gruppe: "Gnagere" });
    expect(findPest("Myodes rutilus")?.norsk).toBe("Rødmus");
    expect(findPest("Klatremus")).toMatchObject({ latin: "Myodes glareolus" });
    expect(findPest("Klatremus")!.aliaser ?? []).not.toContain("rødmus");
  });

  it("det flertydige «anthrenus» peker ikke på én art, men artsnavnene virker", () => {
    expect(findPest("anthrenus")).toBeUndefined();
    expect(findPest("Anthrenus museorum")?.norsk).toBe("Museumsbille");
    expect(findPest("Anthrenus verbasci")?.norsk).toBe("Tepperbille");
  });

  it("hundeloppe og generell «loppe» er ikke katteloppe", () => {
    for (const n of ["hundelopp", "Hundeloppe", "Ctenocephalides canis", "loppe"]) expect(findPest(n), n).toBeUndefined();
    expect(findPest("Kattelopp")).toMatchObject({ latin: "Ctenocephalides felis" });
    expect(findPest("Ctenocephalides felis")?.norsk).toBe("Kattelopp");
  });

  it("alle arter finnes på eget latinske navn, og ingen alias peker på en annen art", () => {
    const n = (s: string) => s.toLowerCase().trim();
    for (const p of PESTS) {
      expect(findPestInGroup(p.latin, p.gruppe), p.norsk).toBe(p);
      for (const a of p.aliaser ?? []) {
        expect(findPestInGroup(a, p.gruppe), `${p.norsk}: ${a}`).toBe(p);
        const annen = PESTS.find((q) => (q.gruppe === "Ekskrementer") === (p.gruppe === "Ekskrementer") && q.latin !== p.latin && (n(q.norsk) === n(a) || n(q.latin) === n(a)));
        expect(annen, `${p.norsk}: ${a}`).toBeUndefined();
      }
    }
  });
});

describe("H1: fagdata for nye arter (FHI felthåndbok 2023)", () => {
  it("pelsbille: 3,5–6 mm, svart med hvite flekker, utendørs opp til Troms", () => {
    const p = findPest("Pelsbille")!;
    expect(p.kjennetegn).toMatch(/3,5–6 mm/);
    expect(p.kjennetegn).toMatch(/svart/i);
    expect(p.kjennetegn).toMatch(/hvite flekker/);
    expect(p.utbredelse).toMatch(/Troms/);
    expect(p.tiltak.join(" ")).toMatch(/60 °C/);
  });

  it("brun pelsbille: brune dekkvinger og svart halsskjold", () => {
    expect(findPest("Brun pelsbille")!.kjennetegn).toMatch(/brune dekkvinger og svart halsskjold/);
  });

  it("rødmus: Salten og nordover; klatremus: nord til Salten", () => {
    const r = findPest("Rødmus")!;
    expect(r.utbredelse).toMatch(/Salten og nordover/);
    expect(r.kjennetegn).toMatch(/gulbrune sider/);
    expect(r.tiltak.join(" ")).toMatch(/musepest/);
    expect(findPest("Klatremus")!.utbredelse).toMatch(/[Nn]ord til Salten/);
  });

  it("katteloppe: FHI kaller den en sjeldnere art i Norge", () => {
    expect(findPest("Kattelopp")!.utbredelse).toMatch(/sjeldnere art i Norge/i);
  });
});

describe("H1: riktige navnepar gir fortsatt riktig art", () => {
  const tilfeller: [string, string, PestGroup, string][] = [
    ["Pelsbille", "Attagenus pellio", "Biller", "Pelsbille"],
    ["Brun pelsbille", "Attagenus smirnovi", "Biller", "Brun pelsbille"],
    ["Rødmus", "Myodes rutilus", "Gnagere", "Rødmus"],
    ["Klatremus", "Myodes glareolus", "Gnagere", "Klatremus"],
    ["Rotte", "Rattus norvegicus", "Gnagere", "Brunrotte"],
    ["Husmus", "", "Gnagere", "Husmus"],
    ["", "Mus musculus", "Gnagere", "Husmus"],
    ["Husmus", "Mus musculus domesticus", "Gnagere", "Husmus"],
    ["Stokkmaur", "Camponotus herculeanus", "Maur", "Stokkmaur"],
    ["Rød skogsmaur", "Formica rufa", "Maur", "Rød skogsmaur"],
    ["Brun tremaur", "Lasius brunneus", "Maur", "Brun tremaur"],
    ["Museumsbille", "Anthrenus museorum", "Biller", "Museumsbille"],
    ["Kattelopp", "Ctenocephalides felis", "Lus, lopper og midd", "Kattelopp"],
    // Steg 1 valgte feil gruppe – arten finnes likevel i hele listen
    ["Pelsbille", "Attagenus pellio", "Andre småkryp", "Pelsbille"],
  ];
  for (const [navn, latin, gruppe, forventet] of tilfeller) {
    it(`${navn || "(uten norsk)"} / ${latin || "(uten latin)"} → ${forventet}`, () => {
      const r = svar({ name: navn, latinName: latin }, gruppe);
      expect(r.found).toBe(true);
      expect(r.name).toBe(forventet);
      expect(r.motstrid).toBeUndefined();
    });
  }

  it("ekskrementer: mus og rotte bestemmes som før", () => {
    expect(svar({ name: "Mus", latinName: "Mus musculus" }, "Ekskrementer").name).toBe("Mus");
    expect(svar({ name: "Brunrotte", latinName: "Rattus norvegicus" }, "Ekskrementer").name).toBe("Brunrotte");
  });
});

describe("H1: motstridende navn gir usikkert resultat – appen velger ikke art", () => {
  const tilfeller: [string, string, PestGroup, string, string][] = [
    ["Klatremus", "Myodes rutilus", "Gnagere", "Klatremus", "Rødmus"],
    ["Rødmus", "Myodes glareolus", "Gnagere", "Rødmus", "Klatremus"],
    ["Brun pelsbille", "Attagenus pellio", "Biller", "Brun pelsbille", "Pelsbille"],
    ["Pelsbille", "Attagenus smirnovi", "Biller", "Pelsbille", "Brun pelsbille"],
    ["Museumsbille", "Anthrenus verbasci", "Biller", "Museumsbille", "Tepperbille"],
    ["Husmus", "Rattus norvegicus", "Gnagere", "Husmus", "Brunrotte"],
    // Alias mot latinsk navn i en annen gruppe
    ["Mus", "Apodemus sylvaticus", "Gnagere", "Husmus", "Liten skogmus"],
  ];
  for (const [navn, latin, gruppe, etterNavn, etterLatin] of tilfeller) {
    it(`${navn} / ${latin}`, () => {
      const r = svar({ name: navn, latinName: latin, confidence: 95 }, gruppe);
      expect(r.found).toBe(false);
      expect(r.motstrid).toMatchObject({ navn, latin });
      expect(visningsnavn(r)).toBe(IKKE_IDENTIFISERT);
      const tekst = motstridTekst(r)!;
      expect(tekst).toContain(etterNavn);
      expect(tekst).toContain(etterLatin);
      expect(tekst).toMatch(/velger ikke mellom dem/);
      // Begge vises som alternativer med lav sikkerhet – aldri som sikker art
      expect(r.alternativer.map((a) => a.name)).toEqual(expect.arrayContaining([etterNavn, etterLatin]));
      for (const a of r.alternativer) expect(a.confidence).toBeLessThan(50);
    });
  }

  it("ekskrementer: «Mus» med latinsk navn for rotte er motstridende, og typen beholdes", () => {
    const r = svar({ name: "Mus", latinName: "Rattus norvegicus" }, "Ekskrementer");
    expect(r.found).toBe(false);
    expect(r.gruppe).toBe("Ekskrementer");
    expect(motstridTekst(r)).toMatch(/Mus.*Brunrotte|Brunrotte.*Mus/);
    expect(oppryddingFor(r)).toBeDefined();
  });

  it("grovsortering «Ukjent» gjør ikke et motstridende svar om til «ingen skadedyr»", () => {
    const r = markerIkkeSkadedyr(svar({ name: "Klatremus", latinName: "Myodes rutilus" }, "Gnagere"), "Ukjent");
    expect(r.ikkeSkadedyr).toBeUndefined();
    expect(r.motstrid).toBeDefined();
  });

  it("PDF-innholdet viser samme usikre bestemmelse som skjermen", () => {
    const r = svar({ name: "Klatremus", latinName: "Myodes rutilus" }, "Gnagere");
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.navn).toBe(IKKE_IDENTIFISERT);
    expect(i.latin).toBeUndefined();
    expect(i.sikkerhet).toBeUndefined();
    expect(i.risiko.etikett).toBeUndefined();
    expect(i.merknader).toContain(motstridTekst(r));
    expect(i.alternativer.map((a) => a.sikkerhet)).toEqual(["Lav sikkerhet", "Lav sikkerhet"]);
  });

  it("motstridende alternativer forkastes i stedet for å bli gjort om til én art", () => {
    const alt = parseAlternatives(
      [
        { name: "Klatremus", latinName: "Myodes rutilus", confidence: 40, hvorfor: "" },
        { name: "Pelsbille", latinName: "Attagenus pellio", confidence: 30, hvorfor: "" },
      ],
      "Biller"
    );
    expect(alt.map((a) => a.name)).toEqual(["Pelsbille"]);
  });

  it("ødelagt motstrid-felt fra historikken krasjer ikke", () => {
    const r = { ...svar({ name: "Ukjent", found: false }, "Gnagere"), motstrid: { navn: 3 } } as never;
    expect(motstridTekst(r)).toBeUndefined();
  });
});

describe("H1: «art utenfor listen» blir ikke gjort om til en art i biblioteket", () => {
  const annen = (annenArt: Record<string, unknown>, gruppe: PestGroup = "Gnagere") =>
    enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "x", confidence: 0, annenArt }, gruppe);

  it("hundeloppe forblir en art utenfor listen – ikke katteloppe", () => {
    const r = annen({ name: "Hundeloppe", latinName: "Ctenocephalides canis", confidence: 70, hvorfor: "" }, "Lus, lopper og midd");
    expect(r.found).toBe(false);
    expect(r.annenArt?.name).toBe("Hundeloppe");
  });

  it("generelt navn med ukjent latinsk navn blir ikke husmus", () => {
    const r = annen({ name: "Mus", latinName: "Apodemus agrarius", confidence: 70, hvorfor: "" });
    expect(r.found).toBe(false);
    expect(r.annenArt).toMatchObject({ name: "Mus", latinName: "Apodemus agrarius" });
  });

  it("pelsbille og rødmus meldt som annen art blir riktig art, ikke nabo-arten", () => {
    expect(annen({ name: "Pelsbille", latinName: "Attagenus pellio", confidence: 70, hvorfor: "" }).name).toBe("Pelsbille");
    expect(annen({ name: "Rødmus", latinName: "Myodes rutilus", confidence: 70, hvorfor: "" }).name).toBe("Rødmus");
  });

  it("art i listen meldt som annen art med riktig latinsk navn godtas som før", () => {
    expect(annen({ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 80, hvorfor: "" }, "Andre pattedyr").name).toBe("Brunrotte");
  });

  it("motstridende annen art gir usikkert, motstridende resultat", () => {
    const r = annen({ name: "Klatremus", latinName: "Myodes rutilus", confidence: 80, hvorfor: "" });
    expect(r.found).toBe(false);
    expect(r.annenArt).toBeUndefined();
    expect(r.motstrid).toBeDefined();
  });
});

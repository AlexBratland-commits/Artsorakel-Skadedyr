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
import {
  generelltNavnTekst,
  IKKE_IDENTIFISERT,
  MOTSTRID_TITTEL,
  motstridKandidater,
  motstridTekst,
  oppryddingFor,
  visningsnavn,
} from "@/lib/resultat-tekst";

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
      expect(tekst).toMatch(/velger ikke mellom dem og oppgir ingen sikkerhet/);
      // Begge vises som mulige arter uten egen sikkerhet – aldri som alternativ med et tall
      const kandidater = motstridKandidater(r);
      expect(kandidater).toHaveLength(2);
      expect(kandidater[0]).toMatch(new RegExp(`^${etterNavn} \\(`));
      expect(kandidater[1]).toMatch(new RegExp(`^${etterLatin} \\(`));
      expect(r.alternativer.map((a) => a.name)).not.toContain(etterNavn);
      expect(r.alternativer.map((a) => a.name)).not.toContain(etterLatin);
      expect(JSON.stringify(r.motstrid)).not.toMatch(/confidence/);
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
    expect(i.motstrid).toEqual({
      tittel: MOTSTRID_TITTEL,
      tekst: motstridTekst(r),
      kandidaterTittel: "Mulige arter (ingen sikkerhet oppgitt)",
      kandidater: ["Klatremus (Myodes glareolus)", "Rødmus (Myodes rutilus)"],
    });
    expect(i.alternativer).toEqual([]);
    expect(JSON.stringify(i)).not.toMatch(/Lav sikkerhet|Middels sikkerhet|Høy sikkerhet/);
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

  it("andre alternativer modellen selv ga, beholdes med modellens egne tall", () => {
    const r = svar(
      { name: "Klatremus", latinName: "Myodes rutilus", alternativer: [{ name: "Markmus", latinName: "Microtus agrestis", confidence: 40, hvorfor: "Butt snute" }] },
      "Gnagere"
    );
    expect(r.alternativer).toEqual([{ name: "Markmus", latinName: "Microtus agrestis", confidence: 40, hvorfor: "Butt snute" }]);
  });

  it("ødelagt motstrid-felt fra historikken krasjer ikke", () => {
    const r = { ...svar({ name: "Ukjent", found: false }, "Gnagere"), motstrid: { navn: 3 } } as never;
    expect(motstridTekst(r)).toBeUndefined();
    expect(motstridKandidater(r)).toEqual([]);
    const utenKandidater = { ...svar({ name: "Klatremus", latinName: "Myodes rutilus" }, "Gnagere") };
    utenKandidater.motstrid = { ...utenKandidater.motstrid!, kandidater: "x" as never };
    expect(motstridKandidater(utenKandidater)).toEqual(["Klatremus (Myodes glareolus)", "Rødmus (Myodes rutilus)"]);
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

describe("H1: generelle navn gir aldri en sikker artsbestemmelse alene", () => {
  const generelle: [string, PestGroup, string][] = [
    ["Mus", "Gnagere", "Husmus"],
    ["Rotte", "Gnagere", "Brunrotte"],
    ["Skogmus", "Gnagere", "Liten skogmus"],
    ["Veps", "Veps og bier", "Vanlig veps"],
    ["Bie", "Veps og bier", "Honningbie"],
    ["Møll", "Møll", "Klesmøll"],
    ["Flue", "Fluer og mygg", "Husflue"],
    ["Blåflue", "Fluer og mygg", "Spyflue"],
    ["Kakerlakk", "Kakerlakker", "Tysk kakerlakk"],
    ["Jordmaur", "Maur", "Svart jordmaur"],
    ["Edderkopp", "Edderkoppdyr", "Husedderkopp"],
    ["Flått", "Edderkoppdyr", "Skogflått"],
    ["Midd", "Lus, lopper og midd", "Husstøvmidd"],
    ["Måke", "Fugler", "Gråmåke"],
    ["Treorm", "Biller", "Stripet borebille"],
  ];
  for (const [navn, gruppe, art] of generelle) {
    it(`«${navn}» alene → «Mulig ${art}» med lav sikkerhet`, () => {
      for (const latin of ["", "Ukjent"]) {
        const r = svar({ name: navn, latinName: latin, confidence: 95 }, gruppe);
        expect(r.found).toBe(true);
        expect(r.name).toBe(art);
        expect(r.confidence).toBeLessThan(50);
        expect(r.usikkerKandidat).toBe(true);
        expect(visningsnavn(r)).toBe(`Mulig ${art}`);
        expect(generelltNavnTekst(r)).toContain(`«${navn}»`);
      }
    });
  }

  it("generelt navn med bekreftende vitenskapelig navn beholder modellens sikkerhet", () => {
    const tilfeller: [string, string, PestGroup, string][] = [
      ["Mus", "Mus musculus", "Gnagere", "Husmus"],
      ["Rotte", "Rattus norvegicus", "Gnagere", "Brunrotte"],
      ["Veps", "Vespula vulgaris", "Veps og bier", "Vanlig veps"],
      ["Møll", "Tineola bisselliella", "Møll", "Klesmøll"],
      ["Flue", "Musca domestica", "Fluer og mygg", "Husflue"],
      ["Kakerlakk", "Blattella germanica", "Kakerlakker", "Tysk kakerlakk"],
    ];
    for (const [navn, latin, gruppe, art] of tilfeller) {
      const r = svar({ name: navn, latinName: latin, confidence: 90 }, gruppe);
      expect(r, navn).toMatchObject({ found: true, name: art, confidence: 90, usikkerKandidat: false });
      expect(generelltNavnTekst(r)).toBeUndefined();
    }
  });

  it("generelt navn med vitenskapelig navn for en annen art i listen er motstridende", () => {
    const r = svar({ name: "Kakerlakk", latinName: "Periplaneta americana" }, "Kakerlakker");
    expect(r.found).toBe(false);
    expect(motstridKandidater(r)).toEqual(["Tysk kakerlakk (Blattella germanica)", "Amerikansk kakerlakk (Periplaneta americana)"]);
  });

  it("generelt navn med ukjent vitenskapelig navn gir bare et mulig forslag", () => {
    const r = svar({ name: "Veps", latinName: "Vespula rufa", confidence: 90 }, "Veps og bier");
    expect(r).toMatchObject({ name: "Vanlig veps", usikkerKandidat: true });
    expect(r.confidence).toBeLessThan(50);
  });

  it("artsnavn og faglig riktige synonymer gir fortsatt sikker bestemmelse", () => {
    const tilfeller: [string, PestGroup, string][] = [
      ["Husmus", "Gnagere", "Husmus"],
      ["Tysk kakerlakk", "Kakerlakker", "Tysk kakerlakk"],
      ["Klesmøll", "Møll", "Klesmøll"],
      ["Sølvfisk", "Kre", "Sølvkre"],
      ["Sengelus", "Andre småkryp", "Veggedyr"],
      ["Majorstubille", "Biller", "Brun pelsbille"],
      ["Brun rotte", "Gnagere", "Brunrotte"],
      ["Hermelin", "Andre pattedyr", "Røyskatt"],
      ["Stokkemaur", "Maur", "Stokkmaur"],
    ];
    for (const [navn, gruppe, art] of tilfeller) {
      const r = svar({ name: navn, latinName: "", confidence: 90 }, gruppe);
      expect(r, navn).toMatchObject({ found: true, name: art, confidence: 90, usikkerKandidat: false });
    }
  });

  it("alternativer med bare et generelt navn får lav sikkerhet", () => {
    const alt = parseAlternatives(
      [
        { name: "Mus", latinName: "", confidence: 70, hvorfor: "" },
        { name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 60, hvorfor: "" },
      ],
      "Gnagere"
    );
    expect(alt).toMatchObject([{ name: "Brunrotte", confidence: 60 }, { name: "Husmus", confidence: 49 }]);
  });

  it("art utenfor listen med bare et generelt navn blir et mulig forslag, ikke en sikker art", () => {
    const r = enrich(
      { found: false, name: "Ukjent", latinName: "Ukjent", description: "x", confidence: 0, annenArt: { name: "Mus", latinName: "", confidence: 85, hvorfor: "" } },
      "Andre pattedyr"
    );
    expect(r).toMatchObject({ found: true, name: "Husmus", usikkerKandidat: true, generelltNavn: "Mus" });
    expect(r.confidence).toBeLessThan(50);
  });

  it("PDF-innholdet forklarer det generelle navnet og viser «Mulig» og lav sikkerhet", () => {
    const r = svar({ name: "Møll", latinName: "", confidence: 95 }, "Møll");
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.navn).toBe("Mulig Klesmøll");
    expect(i.sikkerhet?.etikett).toBe("Lav sikkerhet");
    expect(i.merknader).toContain(generelltNavnTekst(r));
  });

  it("ekskrementer er unntatt: «Mus» er hovedsvaret, og «Rotte» følger F4 som før", () => {
    const mus = svar({ name: "Mus", latinName: "", confidence: 85 }, "Ekskrementer");
    expect(mus).toMatchObject({ found: true, name: "Mus", confidence: 85 });
    expect(mus.generelltNavn).toBeUndefined();
    const rotte = svar({ name: "Rotte", latinName: "", confidence: 95 }, "Ekskrementer");
    expect(rotte).toMatchObject({ found: true, name: "Brunrotte", confidence: 79 });
  });
});

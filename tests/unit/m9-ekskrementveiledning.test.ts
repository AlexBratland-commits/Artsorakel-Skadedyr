/**
 * M9 (revisjon): ingen oppfordring til å knuse, trykke på eller ta på
 * ekskrementer – heller ikke med hansker – og en felles, FHI-basert
 * veiledning for trygg opprydding (FHI felthåndbok 2023 s. 117–124;
 * FHI om musepest: fuktig klut, ikke kost/støvsuger, hansker og munnbind).
 * Feilet på main 2a81de6 og består etter rettelsen.
 */
import { describe, expect, it } from "vitest";
import { enrich, MUS_FLAGGERMUS_FORBEHOLD } from "@/lib/identification";
import { PESTS, findPestInGroup } from "@/lib/pests";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { OPPRYDDING_EKSKREMENTER } from "@/lib/resultat-tekst";

/** Formuleringer som ber brukeren selv knuse, trykke eller ta på funnet. */
const OPPFORDRING = /når du (knuser|trykker)|trykker på (dem|det)|mellom fingrene|(?<!ikke ta på eller )\bknus(e|er)?\b|klem/i;

const ekskrement = (raw: Record<string, unknown>) => enrich({ description: "x", alternativer: [], ...raw }, "Ekskrementer");

describe("M9: ingen oppfordring til å knuse eller trykke", () => {
  it("forbeholdet om mus og flaggermus ber ikke brukeren knuse – og sier at man ikke skal ta på", () => {
    expect(MUS_FLAGGERMUS_FORBEHOLD).not.toMatch(OPPFORDRING);
    expect(MUS_FLAGGERMUS_FORBEHOLD).toMatch(/Ikke ta på eller knus ekskrementene/);
    expect(MUS_FLAGGERMUS_FORBEHOLD).toMatch(/insektrester/);
  });

  it("«Slik bekrefter du funnet» for ekskrementer ber aldri om berøring", () => {
    for (const p of PESTS.filter((x) => x.gruppe === "Ekskrementer")) {
      for (const b of p.bekreftelse ?? []) {
        expect(b, p.norsk).not.toMatch(OPPFORDRING);
        expect(b, p.norsk).not.toMatch(/berøring|ta på|trykk/i);
      }
    }
    expect(findPestInGroup("Flaggermus", "Ekskrementer")!.bekreftelse).toContain("Tørre, og ser ut til å bestå av glinsende insektrester");
  });

  it("ingen tiltak eller merknader for ekskrementer oppfordrer til å knuse eller trykke", () => {
    for (const p of PESTS.filter((x) => x.gruppe === "Ekskrementer")) {
      for (const t of [...p.tiltak, p.notat ?? ""]) expect(t, p.norsk).not.toMatch(OPPFORDRING);
    }
  });

  it("grensetilfelle: beskrivende kjennetegn for dyr (svart tremaur) er fortsatt lov", () => {
    expect(findPestInGroup("Svart tremaur", "Maur")!.kjennetegn).toMatch(/appelsinlukt når den knuses/);
  });
});

describe("M9: trygg opprydding (FHI)", () => {
  it("teksten følger FHI: hansker, munnbind, fukte, klut, ikke fei eller støvsug", () => {
    expect(OPPRYDDING_EKSKREMENTER).toBe(
      "Ved opprydding: bruk hansker og munnbind, fukt ekskrementene med såpevann og tørk opp med klut. Ikke fei eller støvsug – det kan virvle opp smittestoffer."
    );
  });

  it("vises for mus, rotte, flaggermus og ukjente ekskrementer – på skjerm-grunnlaget og i PDF-en", () => {
    const tilfeller = [
      ekskrement({ found: true, name: "Mus", latinName: "Mus musculus", confidence: 85 }),
      ekskrement({ found: true, name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 85 }),
      ekskrement({ found: true, name: "Flaggermus", latinName: "Chiroptera", confidence: 85 }),
      ekskrement({ found: false, name: "Ukjent", latinName: "Ukjent", confidence: 0 }),
      ekskrement({ found: true, name: "Mus", latinName: "Mus musculus", confidence: 35 }), // usikker «Mulig Mus»
    ];
    for (const r of tilfeller) {
      expect(lagRapportInnhold(r, { analyseTid: new Date() }).opprydding, r.name).toBe(OPPRYDDING_EKSKREMENTER);
    }
  });

  it("grensetilfeller: ikke for mårdyr-ekskrementer eller bilder av selve dyret", () => {
    const mink = ekskrement({ found: true, name: "Mink", latinName: "Neogale vison", confidence: 85 });
    const husmus = enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 90 }, "Gnagere");
    expect(lagRapportInnhold(mink, { analyseTid: new Date() }).opprydding).toBeUndefined();
    expect(lagRapportInnhold(husmus, { analyseTid: new Date() }).opprydding).toBeUndefined();
  });
});

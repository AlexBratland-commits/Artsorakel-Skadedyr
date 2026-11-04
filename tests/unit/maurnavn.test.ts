/**
 * Brun tremaur og stokkmaur – norske og vitenskapelige navn (FHI som kilde).
 *
 * Brun tremaur er Lasius brunneus (tidligere «brun jordmaur»), en liten maur.
 * Jordstokkmaur (Camponotus ligniperda) og skogstokkmaur (C. herculeanus) er
 * stokkmaur. Tidligere sto brun tremaur feilaktig som Camponotus ligniperda.
 * Kilder:
 *   https://www.fhi.no/sk/skadedyrhandboka/maur/brun-tremaur/
 *   https://www.fhi.no/sk/skadedyrhandboka/maur/stokkmaur/
 */
import { describe, expect, it } from "vitest";
import { findPest, findPestInGroup, fhiUrl, GROUP_FOCUS, groupPromptList, PEST_PROMPT_LIST, PESTS } from "@/lib/pests";
import { lookupPest } from "@/lib/identification";
import { byggAssistentPrompt } from "@/lib/server/assistent";

const brun = () => findPestInGroup("Brun tremaur", "Maur")!;
const stokk = () => findPestInGroup("Stokkmaur", "Maur")!;
const alleFelt = (p: object) => JSON.stringify(p);

describe("brun tremaur er Lasius brunneus – aldri jordstokkmaur", () => {
  it("riktig vitenskapelig navn, FHI-lenke og størrelse", () => {
    expect(brun().latin).toBe("Lasius brunneus");
    expect(brun().slug).toBe("brun-tremaur");
    expect(fhiUrl(brun().slug)).toBe("https://www.fhi.no/sk/skadedyrhandboka/maur/brun-tremaur/");
    expect(brun().kjennetegn).toMatch(/Arbeidere 3,2–4,5 mm, dronninger 8–9 mm/);
    expect(brun().kjennetegn).toMatch(/lysebrun mellomkropp og mørkere brunt hode og bakkropp/);
    expect(brun().aliaser).toContain("brun jordmaur");
  });

  it("ingen felt i brun tremaur nevner Camponotus, ligniperda eller stokkmaurens størrelse", () => {
    const t = alleFelt(brun());
    expect(t).not.toMatch(/Camponotus|ligniperda|herculeanus/i);
    expect(t).not.toMatch(/6–18 mm|som stokkmaur|Samme håndtering som stokkmaur/);
  });

  it("jordstokkmaur og Camponotus-navn slås opp som stokkmaur, aldri som brun tremaur", () => {
    for (const navn of ["Jordstokkmaur", "Skogstokkmaur", "Camponotus ligniperda", "Camponotus herculeanus", "Camponotus spp."]) {
      expect(findPest(navn)?.norsk, navn).toBe("Stokkmaur");
      expect(lookupPest(navn, navn, "Maur")?.norsk, navn).toBe("Stokkmaur");
    }
    expect(lookupPest("Ukjent", "Camponotus ligniperda", "Maur")?.norsk).toBe("Stokkmaur");
    expect(findPest("Lasius brunneus")?.norsk).toBe("Brun tremaur");
    expect(findPest("Brun jordmaur")?.norsk).toBe("Brun tremaur");
  });

  it("ingen annen art har «ligniperda» eller «brunneus» som navn eller alias", () => {
    for (const p of PESTS) {
      const navn = [p.latin, ...(p.aliaser ?? [])].join(" ");
      if (p.norsk !== "Stokkmaur") expect(navn, p.norsk).not.toMatch(/ligniperda|Camponotus/i);
      if (p.norsk !== "Brun tremaur") expect(navn, p.norsk).not.toMatch(/brunneus/i);
    }
  });
});

describe("stokkmaur etter FHI", () => {
  it("arbeidere og dronninger skilles, og flere Camponotus-arter omfattes", () => {
    expect(stokk().latin).toBe("Camponotus spp.");
    expect(stokk().kjennetegn).toMatch(/Arbeidere ca\. 5–14 mm, dronninger opptil 18 mm/);
    expect(stokk().kjennetegn).toMatch(/Norges største maur/);
    expect(stokk().kjennetegn).not.toMatch(/^6–18 mm/);
    expect(stokk().forveksles?.join(" ")).toMatch(/Brun tremaur – mye mindre \(arbeidere 3,2–4,5 mm\)/);
  });
});

describe("bildeidentifiseringens artsdata og nøkkel", () => {
  it("maur-nøkkelen plasserer brun tremaur blant de små maurene", () => {
    const n = GROUP_FOCUS.Maur;
    expect(n).toMatch(/brun tremaur 3,2–4,5 mm/);
    expect(n).toMatch(/lysebrun mellomkropp og mørkere hode og bakkropp → brun tremaur/);
    expect(n).not.toMatch(/brun tremaur \(rødbrun/);
  });

  it("artslistene til bildeanalysen bruker riktig navn", () => {
    for (const liste of [groupPromptList("Maur"), PEST_PROMPT_LIST]) {
      expect(liste).toContain("Brun tremaur (Lasius brunneus)");
      expect(liste).not.toContain("Brun tremaur (Camponotus");
      expect(liste).toContain("Stokkmaur (Camponotus spp.)");
    }
  });

  it("assistentens faggrunnlag skiller brun tremaur fra jordstokkmaur, og den godkjente ordlyden står", () => {
    const p = byggAssistentPrompt("Jeg har funnet sagflis og flere store maur rundt vinduskarmen. Hva gjør jeg?");
    expect(p).toContain("«Dette kan tyde på stokkmaur. Store maur kombinert med utkast/sagflis ved en bygningskonstruksjon er typiske tegn som bør undersøkes nærmere. Andre maurarter kan ikke utelukkes uten en nærmere artsbestemmelse.»");
    expect(p).toMatch(/Den er ikke det samme som jordstokkmaur \(Camponotus ligniperda\), som er en stokkmaur/);
    expect(p).toMatch(/Brun tremaur \(Lasius brunneus, Maur\)/);
    expect(p).not.toMatch(/Brun tremaur \(Camponotus/);
  });
});

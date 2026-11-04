/**
 * Regresjonstester for logikkfeilene F1–F4 fra revisjonen (leveranse B).
 * Ren logikk etter AI-svaret – ingen AI-kall, ingen promptendringer.
 */
import { describe, expect, it } from "vitest";
import { enrich, EKSKREMENT_UKJENT_TEKST, ROTTE_FORBEHOLD } from "@/lib/identification";

const svar = (s: Record<string, unknown>) => ({ found: true, description: "Beskrivelse fra AI.", ...s });

describe("B1 / F3: sikkerhetstallet tolkes robust", () => {
  it.each([
    ["85%", 85],
    ["85 %", 85],
    ["85", 85],
    [85, 85],
    [0.85, 85],
    ["0,85", 85],
  ])("%j gir %i", (verdi, forventet) => {
    expect(enrich(svar({ name: "Husmus", latinName: "Mus musculus", confidence: verdi }), "Gnagere").confidence).toBe(forventet);
  });

  it("manglende sikkerhet gir lav sikkerhet («Mulig …»), ikke et oppdiktet 55", () => {
    const r = enrich(svar({ name: "Husmus", latinName: "Mus musculus" }), "Gnagere");
    expect(r.found).toBe(true);
    expect(r.confidence).toBe(30);
    expect(r.usikkerKandidat).toBe(true);
  });

  it("uleselig sikkerhet («høy») behandles som manglende", () => {
    expect(enrich(svar({ name: "Husmus", latinName: "Mus musculus", confidence: "høy" }), "Gnagere").confidence).toBe(30);
  });
});

describe("B2 / F4: «rotte» på ekskrementer", () => {
  it("«Rotte» normaliseres til Brunrotte, men gir aldri høy sikkerhet alene", () => {
    const r = enrich(svar({ name: "Rotte", latinName: "Rattus", confidence: 92 }), "Ekskrementer");
    expect(r).toMatchObject({ found: true, name: "Brunrotte", gruppe: "Ekskrementer", fhiSlug: "rotte-ekskrementer" });
    expect(r.confidence).toBeLessThan(80);
    expect(r.forbehold).toBe(ROTTE_FORBEHOLD);
  });

  it("også «rotteekskrementer» regnes som et generelt ord", () => {
    const r = enrich(svar({ name: "rotteekskrementer", latinName: "", confidence: 90 }), "Ekskrementer");
    expect(r.name).toBe("Brunrotte");
    expect(r.confidence).toBeLessThan(80);
  });

  it("Brunrotte bestemt ut fra kjennetegn beholder sikkerheten, men får forbeholdet om svartrotte", () => {
    const r = enrich(svar({ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 90 }), "Ekskrementer");
    expect(r.confidence).toBe(90);
    expect(r.forbehold).toBe(ROTTE_FORBEHOLD);
    expect(r.forbehold).toMatch(/svartrotte/);
  });

  it("forbeholdet gjelder ikke brunrotte som dyr eller andre ekskrementer", () => {
    expect(enrich(svar({ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 90 }), "Gnagere").forbehold).toBeUndefined();
    expect(enrich(svar({ name: "Mus", latinName: "Mus musculus", confidence: 90 }), "Ekskrementer").forbehold).toBeUndefined();
  });

  it("svartrotte tvinges ikke inn som sikker ekskrementbestemmelse", () => {
    const r = enrich(svar({ name: "Svartrotte", latinName: "Rattus rattus", confidence: 80 }), "Ekskrementer");
    expect(r.found).toBe(false);
  });
});

describe("B3 / F1: ukjente ekskrementfunn", () => {
  it("art som ikke passer biblioteket gir godkjent forklaring – ingen oppdiktet art", () => {
    const r = enrich(
      {
        found: false,
        name: "Ukjent",
        description: "Runde, mørke.",
        observasjon: "5–8 mm, runde",
        confidence: 0,
        annenArt: { name: "Ekorn", latinName: "Sciurus vulgaris", confidence: 75, hvorfor: "Runde" },
      },
      "Ekskrementer"
    );
    expect(r.found).toBe(false);
    expect(r.name).toBe("Ukjent"); // API-kontrakten er uendret
    expect(r.description).toBe(EKSKREMENT_UKJENT_TEKST);
    expect(r.annenArt).toBeUndefined();
    expect(r.observasjon).toBe("5–8 mm, runde"); // det AI-en faktisk så, beholdes
  });

  it("også arter utenfor hele biblioteket (f.eks. katt) vises ikke som forslag på ekskrementer", () => {
    const r = enrich(
      { found: false, name: "Ukjent", confidence: 0, annenArt: { name: "Katt", latinName: "Felis catus", confidence: 80 } },
      "Ekskrementer"
    );
    expect(r.annenArt).toBeUndefined();
    expect(r.description).toBe(EKSKREMENT_UKJENT_TEKST);
  });

  it("et oppdiktet artsnavn blir ikke et funn", () => {
    const r = enrich(svar({ name: "Gigantrotte", latinName: "Rattus giganteus", confidence: 95 }), "Ekskrementer");
    expect(r.found).toBe(false);
    expect(r.description).toBe(EKSKREMENT_UKJENT_TEKST);
  });

  it("for dyr beholdes «annen art utenfor databasen» som før", () => {
    const r = enrich(
      { found: false, name: "Ukjent", confidence: 0, annenArt: { name: "Gresshoppe", latinName: "Caelifera", confidence: 70 } },
      "Andre småkryp"
    );
    expect(r.annenArt?.name).toBe("Gresshoppe");
  });
});

describe("B4 / F2: feil gruppe i steg 1 ødelegger ikke et riktig svar", () => {
  it("riktig art fra en annen gruppe (meldt som «annen art») godtas fra biblioteket", () => {
    const r = enrich(
      {
        found: false,
        name: "Ukjent",
        confidence: 0,
        annenArt: { name: "Tysk kakerlakk", latinName: "Blattella germanica", confidence: 85, hvorfor: "To mørke striper" },
      },
      "Biller"
    );
    expect(r).toMatchObject({ found: true, name: "Tysk kakerlakk", gruppe: "Kakerlakker", confidence: 85, severity: "høy" });
    expect(r.tiltak.length).toBeGreaterThan(0);
  });

  it("men aldri en ekskrementoppføring når bildet er av et dyr", () => {
    const r = enrich(
      { found: false, name: "Ukjent", confidence: 0, annenArt: { name: "Mus", latinName: "Mus musculus / Apodemus sp.", confidence: 85 } },
      "Biller"
    );
    expect(r.gruppe).not.toBe("Ekskrementer");
  });

  it("found:false med et kjent navn er fortsatt «Ukjent» (som før)", () => {
    expect(enrich({ found: false, name: "Husmus", latinName: "Mus musculus", confidence: 60 }, "Gnagere").found).toBe(false);
    expect(enrich({ found: false, name: "Mus", latinName: "Mus musculus", confidence: 60 }, "Ekskrementer").found).toBe(false);
  });

  it("lav sikkerhet på den korrigerte arten gir fortsatt «Ukjent»", () => {
    const r = enrich(
      { found: false, name: "Ukjent", confidence: 0, annenArt: { name: "Tysk kakerlakk", latinName: "Blattella germanica", confidence: 20 } },
      "Biller"
    );
    expect(r.found).toBe(false);
  });
});

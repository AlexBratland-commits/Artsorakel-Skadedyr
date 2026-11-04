/**
 * Artsavhengige råd om tetting (oppgave 1 etter test i Preview).
 * Rådene ligger i bibliotekets tiltak-felter, som IKKE inngår i
 * identifiseringspromptene – grunnlinje-snapshotene bekrefter det.
 */
import { describe, expect, it } from "vitest";
import { findPestInGroup, PESTS } from "@/lib/pests";

const HOVEDREGEL =
  "Sikre åpninger der mus og rotter kan komme inn, slik at nye dyr hindres adgang. Undersøk samtidig om det allerede finnes gnagere inne i bygningen, og gjennomfør nødvendig fangst eller bekjempelse. Ved omfattende aktivitet eller usikkerhet om hvor dyrene oppholder seg, bør en skadedyrbekjemper kontaktes.";

const tiltak = (navn: string, gruppe: string) => findPestInGroup(navn, gruppe)!.tiltak.join(" | ");

const MUS: [string, string][] = [
  ["Husmus", "Gnagere"],
  ["Liten skogmus", "Gnagere"],
  ["Mus", "Ekskrementer"],
];
const ROTTE: [string, string][] = [
  ["Brunrotte", "Gnagere"],
  ["Svartrotte", "Gnagere"],
  ["Brunrotte", "Ekskrementer"],
];

describe("råd om tetting", () => {
  it.each(MUS)("%s (%s): åpninger fra omtrent 4–6 mm", (navn, gruppe) => {
    expect(tiltak(navn, gruppe)).toMatch(/fra omtrent 4–6 mm/);
    expect(tiltak(navn, gruppe)).not.toMatch(/10–14 mm/);
  });

  it.each(ROTTE)("%s (%s): åpninger fra omtrent 10–14 mm", (navn, gruppe) => {
    expect(tiltak(navn, gruppe)).toMatch(/fra omtrent 10–14 mm/);
    expect(tiltak(navn, gruppe)).not.toMatch(/4–6 mm/);
  });

  it.each([...MUS, ...ROTTE])("%s (%s): ingen absolutt grense, og ny hovedregel for tetting", (navn, gruppe) => {
    const t = tiltak(navn, gruppe);
    expect(t).not.toMatch(/12 mm eller mer|fra 6 mm og opp|Tett alle åpninger/);
    expect(t).toContain(HOVEDREGEL);
    // Tetting gjøres ikke avhengig av at alle dyr først er fjernet
    expect(t).not.toMatch(/aktiv inngang|Kartlegg før du tetter/);
  });
});

describe("den gamle tetteregelen er borte overalt", () => {
  it("ingen tiltak i biblioteket sier at en aktiv inngang ikke skal tettes", () => {
    for (const p of PESTS) expect(p.tiltak.join(" | ")).not.toMatch(/aktiv inngang bør ikke tettes/);
  });
});

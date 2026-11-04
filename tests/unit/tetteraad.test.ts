/**
 * Artsavhengige råd om tetting (oppgave 1 etter test i Preview).
 * Rådene ligger i bibliotekets tiltak-felter, som IKKE inngår i
 * identifiseringspromptene – grunnlinje-snapshotene bekrefter det.
 */
import { describe, expect, it } from "vitest";
import { findPestInGroup } from "@/lib/pests";

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

  it.each([...MUS, ...ROTTE])("%s (%s): ingen absolutt grense, og kartlegging før en aktiv inngang tettes", (navn, gruppe) => {
    const t = tiltak(navn, gruppe);
    expect(t).not.toMatch(/12 mm eller mer|fra 6 mm og opp|Tett alle åpninger/);
    expect(t).toMatch(/aktiv inngang bør ikke tettes før/);
  });
});

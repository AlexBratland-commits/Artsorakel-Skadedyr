/**
 * Kontrolltester for artsbiblioteket (src/lib/pests.ts). De endrer ingen
 * data – de passer på at biblioteket er internt konsistent, slik at
 * oppslagene i identifiseringen virker som forventet. Faglige forslag som
 * testene avdekker, står i docs/faglige-endringsforslag.md til godkjenning.
 */
import { describe, expect, it } from "vitest";
import { findPest, findPestInGroup, GROUPS, PESTS } from "@/lib/pests";

const norm = (s: string) => s.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, " ").trim();

describe("artsbiblioteket", () => {
  it("har de forventede 83 oppføringene (endring krever godkjenning; H1: + Pelsbille og Rødmus)", () => {
    expect(PESTS).toHaveLength(83);
  });

  it("alle oppføringer har påkrevde felter og gyldig gruppe", () => {
    for (const p of PESTS) {
      expect(p.norsk.trim(), p.norsk).not.toBe("");
      expect(p.latin.trim(), p.norsk).not.toBe("");
      expect(p.kjennetegn.trim(), p.norsk).not.toBe("");
      expect(p.tiltak.length, p.norsk).toBeGreaterThan(0);
      expect(GROUPS, p.norsk).toContain(p.gruppe);
      expect(["lav", "middels", "høy"], p.norsk).toContain(p.alvorlighet);
    }
  });

  it("ingen to arter i samme gruppe har samme navn eller kallenavn", () => {
    for (const g of GROUPS) {
      const sett = new Map<string, string>();
      for (const p of PESTS.filter((x) => x.gruppe === g)) {
        for (const navn of [p.norsk, p.latin, ...(p.aliaser ?? [])].map(norm)) {
          expect(sett.get(navn) ?? p.norsk, `«${navn}» i ${g}`).toBe(p.norsk);
          sett.set(navn, p.norsk);
        }
      }
    }
  });

  it("hver art kan slås opp på sitt eget navn og latinske navn i sin gruppe", () => {
    for (const p of PESTS) {
      expect(findPestInGroup(p.norsk, p.gruppe)).toBe(p);
      expect(findPestInGroup(p.latin, p.gruppe)).toBe(p);
    }
  });

  it("dyrenavn slås opp til dyret, ikke til ekskrementoppføringen med samme navn", () => {
    for (const navn of ["Brunrotte", "Mink", "Mår", "Røyskatt", "Flaggermus"]) {
      expect(findPest(navn)?.gruppe, navn).not.toBe("Ekskrementer");
    }
  });

  it("svartrotte har ingen ekskrementoppføring (bevisst – se F4)", () => {
    expect(findPestInGroup("Svartrotte", "Ekskrementer")).toBeUndefined();
  });

  it("forvekslingslistene har ingen dobbeltlinjer", () => {
    const funn = PESTS.flatMap((p) => {
      const f = p.forveksles ?? [];
      const forste = f.map((x) => x.split("–")[0].trim().toLowerCase());
      return forste.filter((x, i) => forste.indexOf(x) !== i).map((x) => `${p.norsk}: ${x}`);
    });
    // Dobbeltlinjen for stokkmaur/svart jordmaur er slått sammen (godkjent av fagansvarlig)
    expect(funn).toEqual([]);
  });
});

/**
 * Regresjonstester for funn fra den uavhengige revisjonen (main 199dc5e):
 * L1 (ødelagt historikk), M3 (sikkerhet på alternativer), M4 (ukjente
 * ekskrementer mister typen). Testene feilet på 199dc5e og består etter rettelsen.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readHistory } from "@/lib/history";
import { enrich } from "@/lib/identification";
import { lagRapportInnhold } from "@/lib/rapport/innhold";
import { EKSKREMENT_FORBEHOLD } from "@/lib/resultat-tekst";

const lagre = (verdi: string) => {
  const lager = new Map<string, string>([["ocab-skadedyr-historikk", verdi]]);
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => lager.get(k) ?? null, setItem: (k: string, v: string) => void lager.set(k, v), removeItem: (k: string) => void lager.delete(k) },
  });
};

describe("L1: ødelagt historikk i nettleseren", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ugyldige oppføringer forkastes, gyldige beholdes", () => {
    const gyldig = {
      id: "a",
      tid: "2026-11-01T10:00:00.000Z",
      thumb: "",
      sted: "",
      resultat: { found: true, name: "Husmus", latinName: "Mus musculus", description: "x", severity: "middels", fhiSlug: "mus", confidence: 90, tiltak: ["t"], alternativer: [], fhiUrl: "https://www.fhi.no/" },
    };
    lagre(JSON.stringify([null, 42, "tekst", {}, { id: "b" }, { id: "c", tid: "x", resultat: null }, gyldig]));
    const h = readHistory();
    expect(h).toHaveLength(1);
    expect(h[0].resultat.name).toBe("Husmus");
  });

  it("manglende lister i et gammelt resultat blir tomme lister, ikke krasj", () => {
    lagre(JSON.stringify([{ id: "a", tid: "2026-11-01T10:00:00.000Z", resultat: { found: false, name: "Ukjent" } }]));
    const [e] = readHistory();
    expect(e.thumb).toBe("");
    expect(e.resultat.tiltak).toEqual([]);
    expect(e.resultat.alternativer).toEqual([]);
  });

  it("ikke-liste og ugyldig JSON gir tom historikk", () => {
    lagre('{"ikke":"liste"}');
    expect(readHistory()).toEqual([]);
    lagre("{ødelagt");
    expect(readHistory()).toEqual([]);
  });
});

describe("M3: sikkerhet på alternativer", () => {
  it("alternativer tolker prosent på samme måte som hovedforslaget", () => {
    const r = enrich(
      {
        found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: "85%",
        alternativer: [
          { name: "Brunrotte", latinName: "Rattus norvegicus", confidence: "40%", hvorfor: "a" },
          { name: "Liten skogmus", latinName: "Apodemus sylvaticus", confidence: 0.3, hvorfor: "b" },
          { name: "Stor skogmus", latinName: "Apodemus flavicollis", confidence: "20 %", hvorfor: "c" },
        ],
      },
      "Gnagere"
    );
    expect(r.confidence).toBe(85);
    expect(r.alternativer.map((a) => a.confidence)).toEqual([40, 30, 20]);
  });

  it("et alternativ som er minst like sannsynlig som hovedforslaget, skjules ikke i PDF-en", () => {
    const r = enrich(
      { found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 80, alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 99, hvorfor: "y" }] },
      "Gnagere"
    );
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.alternativer[0].sikkerhet).toBe("Høy sikkerhet");
    expect(i.merknader.join(" ")).toMatch(/minst like sannsynlig/);
  });

  it("vanlige tilfeller er uendret: svakere alternativ på samme nivå vises uten nivå", () => {
    const r = enrich(
      { found: true, name: "Husmus", latinName: "Mus musculus", description: "x", confidence: 95, alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 85, hvorfor: "y" }] },
      "Gnagere"
    );
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.alternativer[0].sikkerhet).toBeUndefined();
    expect(i.merknader.join(" ")).not.toMatch(/minst like sannsynlig/);
  });
});

describe("M4: ukjente ekskrementer beholder typen", () => {
  it("gruppe, råd om ekskrementer og forbehold i PDF-en", () => {
    const r = enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "", confidence: 0 }, "Ekskrementer");
    expect(r.gruppe).toBe("Ekskrementer");
    expect(r.tiltak.join(" ")).toMatch(/ekskrementene/);
    expect(r.tiltak.join(" ")).not.toMatch(/dyret/);
    const i = lagRapportInnhold(r, { analyseTid: new Date() });
    expect(i.type).toBe("Ekskrementer");
    expect(i.forbehold).toContain(EKSKREMENT_FORBEHOLD);
  });

  it("ukjente dyr er uendret (ingen gruppe fra et usikkert steg 1)", () => {
    const r = enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "", confidence: 0 }, "Maur");
    expect(r.gruppe).toBeUndefined();
    expect(r.tiltak[0]).toMatch(/nærmere dyret/);
  });
});

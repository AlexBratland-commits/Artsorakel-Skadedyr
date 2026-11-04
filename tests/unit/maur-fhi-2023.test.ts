/**
 * Maurartene kontrollert mot FHIs felthåndbok for skadedyr, 7. utg. 2023,
 * s. 79–87 (godkjente føringer fra fagansvarlig). Sidetall står ved hver test.
 */
import { describe, expect, it } from "vitest";
import { findPest, findPestInGroup, GROUP_FOCUS, PESTS } from "@/lib/pests";

const art = (navn: string) => findPestInGroup(navn, "Maur")!;
const alt = (navn: string) => JSON.stringify(art(navn));
const SJ =
  "Svart jordmaur gnager normalt ikke i friskt treverk, men kan etablere reir og lage ganger i råteskadet treverk og isolasjonsmaterialer som isopor. Dette kan føre til lokale skader i konstruksjonen. Ved mistanke om reir i bygningen bør forholdene undersøkes nærmere, også med tanke på fukt eller tidligere vannskader.";

describe("svart jordmaur (s. 82)", () => {
  it("beskrives aldri som en art som ikke kan gjøre bygningsskade", () => {
    for (const p of PESTS) expect(JSON.stringify(p), p.norsk).not.toMatch(/gjør ikke bygningsskade/);
    expect(art("Svart jordmaur").tiltak).toContain(SJ);
    const iStokkmaur = art("Stokkmaur").forveksles!.find((f) => f.startsWith("Svart jordmaur"))!;
    expect(iStokkmaur).toMatch(/kan lage reir og ganger i råteskadet treverk og isopor/);
  });

  it("hår på første antenneledd, sukkermaur, og utbredelse uten «hele landet»", () => {
    expect(art("Svart jordmaur").kjennetegn).toMatch(/Første antenneledd \(det lange\) har utstående hår/);
    expect(findPest("sukkermaur")?.norsk).toBe("Svart jordmaur");
    expect(art("Svart jordmaur").utbredelse).toBe("Svært vanlig i lavlandet i Sør-Norge. Utendørs finnes den nord til og med Trøndelag");
  });
});

describe("stokkmaur (s. 80)", () => {
  it("utbredelse, sverming og tegn på reir", () => {
    const s = art("Stokkmaur");
    expect(s.latin).toBe("Camponotus spp.");
    expect(s.kjennetegn).toMatch(/Arbeidere ca\. 5–14 mm/);
    expect(s.utbredelse).toBe("Hele landet, men vanligst i Sør-Norge");
    expect(s.sesong).toMatch(/Sverming fra sent i mai til tidlig i juli, avhengig av landsdel/);
    expect(s.tiltak.join(" ")).toMatch(/utkast av treflis og isolasjonsmateriale/);
    expect(s.tiltak.join(" ")).toMatch(/krafselyder fra konstruksjonen/);
    // Fukt/tørre konstruksjoner og isolasjon beholdes
    expect(s.tiltak.join(" ")).toMatch(/Maur kan imidlertid også etablere seg i tørre konstruksjoner/);
    expect(s.tiltak.join(" ")).toMatch(/isolasjonsmaterialer og polystyren/);
  });
});

describe("brun tremaur (s. 83)", () => {
  it("utseende, antennehår med forbehold, sverming og navn", () => {
    const b = art("Brun tremaur");
    expect(b.latin).toBe("Lasius brunneus");
    expect(b.alvorlighet).toBe("middels");
    expect(b.kjennetegn).toMatch(/Arbeidere 3,2–4,5 mm/);
    expect(b.kjennetegn).toMatch(/lysebrun mellomkropp og mørkere brunt hode og bakkropp/);
    expect(b.kjennetegn).toMatch(/uten utstående hår – kan bare brukes når detaljene ses tydelig/);
    expect(b.sesong).toMatch(/Sverming i juni til tidlig i juli/);
    expect(alt("Brun tremaur")).not.toMatch(/Camponotus|ligniperda/);
  });
});

describe("svart tremaur (s. 84)", () => {
  it("utbredelse, appelsinlukt og reir uten gnaging i treverket", () => {
    const t = art("Svart tremaur");
    expect(t.utbredelse).toMatch(/^Sørøst-Norge, fra Aust-Agder nordover til Hedmark/);
    expect(t.kjennetegn).toMatch(/Arbeidere 4–6 mm/);
    expect(t.kjennetegn).toMatch(/appelsinlukt/);
    expect(t.tiltak.join(" ")).toMatch(/gnager normalt ikke i selve treverket. Fuktproblemer rundt reiret kan bidra til råteskader/);
  });

  it("«sitrus» er erstattet av appelsinlukt i alle maurartene og nøkkelen", () => {
    for (const p of PESTS.filter((x) => x.gruppe === "Maur")) expect(JSON.stringify(p), p.norsk).not.toMatch(/sitrus/i);
    expect(GROUP_FOCUS.Maur).not.toMatch(/sitrus/i);
  });
});

describe("faraomaur (s. 81)", () => {
  it("størrelse, farge og stilk med to ledd – advarsel mot sprøyting beholdt", () => {
    const f = art("Faraomaur");
    expect(f.kjennetegn).toBe("Arbeidere 2–2,4 mm, brungul med mørkere bakre del av bakkroppen. Stilken mellom mellomkropp og bakkropp har to ledd");
    expect(f.tiltak.join(" ")).toMatch(/Ikke sprøyt/);
    expect(f.tiltak.join(" ")).toMatch(/godkjent skadedyrbekjemper/);
  });
});

describe("rødmaur/eitermaur (s. 87) og rød skogsmaur (s. 86)", () => {
  it("rødmaur: arts-ID beholdt, eitermaur som gruppe, 3,5–5 mm og søkeord", () => {
    const r = art("Rødmaur");
    expect(r.norsk).toBe("Rødmaur");
    expect(r.latin).toBe("Myrmica spp.");
    expect(r.kjennetegn).toMatch(/Eitermaur – en gruppe med flere arter, vanligst hageeitermaur/);
    expect(r.kjennetegn).toMatch(/Arbeidere 3,5–5 mm/);
    for (const navn of ["eitermaur", "hageeitermaur", "Myrmica rubra"]) expect(findPest(navn)?.norsk, navn).toBe("Rødmaur");
  });

  it("rød skogsmaur: Formica rufa-gruppen og 4,5–9 mm", () => {
    const s = art("Rød skogsmaur");
    expect(s.latin).toBe("Formica rufa-gruppen");
    expect(s.kjennetegn).toMatch(/^Arbeidere 4,5–9 mm/);
    expect(findPest("Formica rufa")?.norsk).toBe("Rød skogsmaur");
  });

  it("den generelle fuktpåstanden er fjernet her, men beholdt hos de andre maurartene", () => {
    for (const p of PESTS) expect(p.tiltak.join(" "), p.norsk).not.toMatch(/Maur inne skyldes som oftest fukt/);
    expect(art("Rødmaur").tiltak.join(" ")).toMatch(/Gjør ingen materielle skader og kommer sjelden inn i hus/);
    expect(art("Rød skogsmaur").tiltak.join(" ")).toMatch(/Tuer innendørs er svært uvanlige, men kan gi fuktskader/);
    for (const navn of ["Stokkmaur", "Brun tremaur", "Svart tremaur", "Svart jordmaur"]) {
      expect(art(navn).tiltak.join(" "), navn).toMatch(/fukt/);
    }
  });
});

describe("maur-nøkkelen (bildeidentifisering)", () => {
  it("ingen ren størrelsesregel for stokkmaur – størrelse vurderes sammen med andre kjennetegn", () => {
    const n = GROUP_FOCUS.Maur;
    expect(n).not.toMatch(/over 6 mm → stokkmaur|over 5 mm → stokkmaur/);
    expect(n).toMatch(/Størrelse er bare ett av kjennetegnene, og artene overlapper/);
    expect(n).toMatch(/konkluder aldri med stokkmaur bare ut fra størrelse/);
    expect(n).toMatch(/stokkmaur ca\. 5–14 mm, rød skogsmaur 4,5–9 mm, svart tremaur 4–6 mm/);
  });
});

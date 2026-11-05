/**
 * PDF-rapport med valgfri samtale, sideskift og sikker kobling mellom
 * funn-chat og analyse. Ingen AI-kall – bare eksisterende data.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { enrich } from "@/lib/identification";
import { lagRapportInnhold, lagSamtaleVedlegg, type SamtaleVedlegg } from "@/lib/rapport/innhold";
import { brytTekst, lagPdfRapport, SAMTALE_FORBEHOLD } from "@/lib/rapport/pdf";
import { samtaleForVisning, type FunnMelding, type LagretFunnSamtale } from "@/lib/rapport/samtale";
import type { AnalysisResult } from "@/lib/types";
import { pdfTekst } from "../helpers/pdf-tekst";

const LOGO = new Uint8Array(readFileSync(path.join(process.cwd(), "public/icons/ocab-logo-merke.png")));
const TID = new Date("2026-11-04T19:37:00Z");
const OVERSKRIFTER = [
  "Vurdering",
  "Kan også være",
  "Risikovurdering",
  "Anbefalte tiltak",
  "Slik bekrefter du funnet",
  "Når bør du kontakte fagfolk?",
  "Slik skiller du den fra liknende arter",
  "Forbehold",
];

const husmus = (ekstra: Record<string, unknown> = {}) =>
  enrich({ found: true, name: "Husmus", latinName: "Mus musculus", description: "Liten gråbrun gnager.", observasjon: "Store ører.", confidence: 88, alternativer: [], ...ekstra }, "Gnagere");

async function lag(result: AnalysisResult, vedlegg?: SamtaleVedlegg) {
  const pdf = await lagPdfRapport(lagRapportInnhold(result, { analyseTid: TID, rapportTid: TID }), LOGO, undefined, vedlegg);
  const sider = await pdfTekst(pdf.bytes);
  return { pdf, sider, alt: sider.join("\n") };
}

/** Innholdslinjene på en side: uten fortsettelses-toppfelt og bunntekst. */
function innholdslinjer(side: string): string[] {
  const linjer = side.split("\n");
  const bunn = linjer.lastIndexOf("Ocab Artsorakel");
  return linjer.slice(0, bunn).filter((l) => l && l !== "Artsorakel – analyserapport (forts.)" && l !== "AI-GENERERT · VEILEDENDE");
}

const vedlegg = (meldinger: FunnMelding[]) => lagSamtaleVedlegg(meldinger, TID);

describe("PDF uten og med samtale", () => {
  it("uten samtale er rapporten uendret (også med tomt vedlegg)", async () => {
    const uten = await lag(husmus());
    const tom = await lag(husmus(), { meldinger: [] });
    expect(tom.sider).toEqual(uten.sider);
    expect(uten.alt).not.toContain("Vedlegg – Samtale med Artsorakel");
    expect(uten.pdf.vedleggStart).toBeUndefined();
  });

  it("én melding: vedlegg på egen side, overskrift, undertekst, forbehold og avsender", async () => {
    const uten = await lag(husmus());
    const med = await lag(husmus(), vedlegg([{ rolle: "user", tekst: "Er den farlig for barn?", tid: "2026-11-04T19:40:00Z" }]));
    expect(med.pdf.sider).toBe(uten.pdf.sider + 1);
    expect(med.pdf.vedleggStart).toBe(uten.pdf.sider + 1);
    // Rapportdelen er lik
    expect(med.sider.slice(0, uten.pdf.sider).map((s) => s.replace(/Side \d+ av \d+/g, ""))).toEqual(uten.sider.map((s) => s.replace(/Side \d+ av \d+/g, "")));
    const side = med.sider[med.pdf.vedleggStart! - 1];
    expect(side).toContain("Vedlegg – Samtale med Artsorakel");
    expect(side).toContain("AI-generert samtale knyttet til dette funnet.");
    expect(side.replace(/\n/g, " ")).toContain(SAMTALE_FORBEHOLD);
    expect(side).toContain("Kunde");
    expect(side).toContain("kl. 20:40");
    expect(side).toContain("Er den farlig for barn?");
    // Sidetall fortsetter gjennom hele dokumentet
    med.sider.forEach((s, i) => expect(s).toContain(`Side ${i + 1} av ${med.pdf.sider}`));
  });

  it("mange meldinger: kronologisk, fordelt over flere sider, med riktig avsender", async () => {
    const meldinger: FunnMelding[] = Array.from({ length: 60 }, (_, i) => ({
      rolle: i % 2 ? "assistant" : "user",
      tekst: `M${String(i).padStart(3, "0")} ${i % 2 ? "Svar om skadedyr og forebygging i boligen." : "Spørsmål om funnet på kjøkkenet?"}`,
    }));
    const { pdf, sider, alt } = await lag(husmus(), vedlegg(meldinger));
    expect(pdf.sider - pdf.vedleggStart! + 1).toBeGreaterThanOrEqual(3);
    let forrige = -1;
    for (let i = 0; i < 60; i++) {
      const pos = alt.indexOf(`M${String(i).padStart(3, "0")} `);
      expect(pos, `melding ${i}`).toBeGreaterThan(forrige);
      forrige = pos;
    }
    expect(alt.match(/^Kunde$/gm)).toHaveLength(30);
    expect(alt.match(/^Artsorakel \(AI\)$/gm)).toHaveLength(30);
    // Forbeholdet står bare på første side av vedlegget
    expect(sider[pdf.vedleggStart! - 1].replace(/\n/g, " ")).toContain(SAMTALE_FORBEHOLD);
    // En avsender står aldri alene nederst på en side
    for (const s of sider.slice(pdf.vedleggStart! - 1)) {
      const sist = innholdslinjer(s).at(-1);
      expect(sist).not.toMatch(/^(Kunde|Artsorakel \(AI\))$/);
    }
  });

  it("lange norske meldinger brytes lesbart og holder seg innenfor margene", async () => {
    const lang =
      "Stokkmaur kan etablere reir i isolasjon og råteskadet treverk. Følg maurstien, se etter utkast av treflis ved vinduskarmen, og undersøk om det finnes fukt eller tidligere vannskader i bunnsvillen. ";
    const tekst = lang.repeat(30) + "Sammensattordsomerekstremtlangtogikkefårplasspåénlinjeiheletattelleriallefall".repeat(2);
    const { pdf, alt } = await lag(husmus(), vedlegg([{ rolle: "user", tekst: "Hva gjør jeg nå? 🐜" }, { rolle: "assistant", tekst }]));
    expect(pdf.sider - pdf.vedleggStart! + 1).toBeGreaterThanOrEqual(2);
    expect(alt).toContain("Hva gjør jeg nå?");
    expect(alt).not.toContain("?🐜");
    expect(alt.replace(/\n/g, " ")).toContain("undersøk om det finnes fukt eller tidligere vannskader i bunnsvillen.");
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (const l of brytTekst(tekst, font, 10, 595.28 - 100 - 14)) expect(font.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(595.28 - 100 - 14);
  });

  it("«Ukjent» resultat med samtale", async () => {
    const ukjent = enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "Bildet er for uskarpt.", confidence: 0 }, "Maur");
    const { pdf, alt } = await lag(ukjent, vedlegg([{ rolle: "user", tekst: "Hva kan dette være?" }, { rolle: "assistant", tekst: "Det kan være flere arter. Ta et skarpere bilde." }]));
    expect(alt).toContain("Kunne ikke identifisere funnet sikkert");
    expect(alt).toContain("Vedlegg – Samtale med Artsorakel");
    expect(alt).toContain("Artsorakel (AI)");
    expect(pdf.vedleggStart).toBeDefined();
  });
});

describe("sideskift", () => {
  it("korte avsnitt holdes samlet, overskrifter står aldri alene, og ingen blanke sider", async () => {
    for (let n = 1; n <= 40; n++) {
      const r = husmus({
        description: "Liten gråbrun gnager med store ører og tynn hale. ".repeat(n),
        observasjon: "av skallrester og frørester i ekskrementene ved kjøkkenbenken",
      });
      const { sider } = await lag(r, vedlegg([{ rolle: "user", tekst: "Er den farlig?" }]));
      sider.forEach((s, i) => {
        const linjer = innholdslinjer(s);
        expect(linjer.length, `n=${n} side ${i + 1} er blank`).toBeGreaterThan(0);
        expect(OVERSKRIFTER, `n=${n} overskrift alene nederst på side ${i + 1}`).not.toContain(linjer.at(-1));
      });
      // «Forslaget bygger på …» deles ikke over to sider
      const side = sider.find((s) => s.includes("Forslaget bygger på:"))!;
      expect(side.replace(/\n/g, " "), `n=${n}`).toContain("ved kjøkkenbenken");
    }
  });

  it("lange avsnitt: aldri én linje alene nederst eller øverst", async () => {
    // Hver linje i beskrivelsen begynner med et nummerert ord, så linjene kan telles per side.
    const ord = Array.from({ length: 400 }, (_, i) => `d${String(i).padStart(3, "0")}`).join(" ");
    for (let forskyvning = 0; forskyvning < 12; forskyvning++) {
      const r = husmus({ description: ord, observasjon: "Store ører. ".repeat(forskyvning + 1) });
      r.tiltak = Array.from({ length: 6 }, (_, i) => `t${i} ` + "Forebygg ved å tette åpninger og fjerne matkilder i boligen. ".repeat(4));
      const { sider } = await lag(r);
      for (const s of sider) {
        const beskrivelse = s.split("\n").filter((l) => /^d\d{3}/.test(l)).length;
        if (beskrivelse) expect(beskrivelse, `forskyvning ${forskyvning}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe("kobling mellom samtale og analyse", () => {
  const a = { ...husmus(), chatToken: "billett-A" };
  const b = { ...husmus(), chatToken: "billett-B" };
  const meldinger: FunnMelding[] = [
    { rolle: "user", tekst: "Spørsmål om A" },
    { rolle: "assistant", tekst: "Svar om A" },
  ];
  const lagret: LagretFunnSamtale = { visning: 3, chatToken: "billett-A", meldinger };

  it("riktig analyse og visning gir meldingene", () => {
    expect(samtaleForVisning(lagret, 3, a)).toEqual(meldinger);
  });

  it("en annen analyse får aldri meldingene", () => {
    expect(samtaleForVisning(lagret, 3, b)).toEqual([]);
    expect(samtaleForVisning(lagret, 4, b)).toEqual([]);
  });

  it("samme analyse åpnet på nytt (ny visning) får ikke den gamle samtalen", () => {
    expect(samtaleForVisning(lagret, 4, a)).toEqual([]);
  });

  it("uten billett, uten analyse eller uten samtale: ingenting", () => {
    expect(samtaleForVisning(lagret, 3, { ...a, chatToken: undefined })).toEqual([]);
    expect(samtaleForVisning({ ...lagret, chatToken: undefined }, 3, { ...a, chatToken: undefined })).toEqual([]);
    expect(samtaleForVisning(lagret, 3, null)).toEqual([]);
    expect(samtaleForVisning(null, 3, a)).toEqual([]);
  });

  it("tidspunkt avgjør ikke koblingen, og tomme meldinger tas ikke med", () => {
    const medTid = { ...lagret, meldinger: [...meldinger.map((m) => ({ ...m, tid: TID.toISOString() })), { rolle: "user" as const, tekst: "  " }] };
    expect(samtaleForVisning(medTid, 4, a)).toEqual([]);
    expect(samtaleForVisning(medTid, 3, a)).toHaveLength(2);
  });

  it("vedlegget beholder rekkefølgen og viser tidspunkt bare når det finnes", () => {
    const v = lagSamtaleVedlegg(
      [
        { rolle: "user", tekst: "Første", tid: "2026-11-04T19:40:00Z" },
        { rolle: "assistant", tekst: "Andre" },
        { rolle: "user", tekst: "Tredje", tid: "2026-11-06T08:05:00Z" },
      ],
      TID
    );
    expect(v.meldinger.map((m) => [m.fra, m.tekst])).toEqual([["kunde", "Første"], ["ai", "Andre"], ["kunde", "Tredje"]]);
    expect(v.meldinger[0].tid).toBe("kl. 20:40");
    expect(v.meldinger[1].tid).toBeUndefined();
    expect(v.meldinger[2].tid).toMatch(/^6\. nov\.?,? (kl\. )?09[:.]05$/);
  });
});

/**
 * PDF-rapporten: innhold fra eksisterende analyseresultat, sidetall,
 * forbehold, bildeproporsjoner og norske tegn. Ingen AI-kall.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { enrich } from "@/lib/identification";
import { AI_FORBEHOLD, filnavnDel, lagRapportInnhold } from "@/lib/rapport/innhold";
import { brytTekst, lagPdfRapport, tilWinAnsi } from "@/lib/rapport/pdf";
import type { AnalysisResult } from "@/lib/types";
import { pdfTekst } from "../helpers/pdf-tekst";

const LOGO = new Uint8Array(readFileSync(path.join(process.cwd(), "public/icons/ocab-logo-merke.png")));
const TID = new Date("2026-11-04T19:37:00Z");
const valg = { analyseTid: TID, rapportTid: TID };

const dyr = (raw: Record<string, unknown>, gruppe: Parameters<typeof enrich>[1] = "Gnagere") => enrich(raw, gruppe);
const husmus = () =>
  dyr({ found: true, name: "Husmus", latinName: "Mus musculus", description: "Liten gråbrun gnager med store ører.", observasjon: "Store ører og tynn hale.", confidence: 88, alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 20, hvorfor: "Ung rotte kan ligne." }] });

async function jpeg(bredde: number, hoyde: number): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: bredde, height: hoyde, channels: 3, background: "#8a6a4a" } }).jpeg().toBuffer());
}

async function lag(result: AnalysisResult, bilde?: { jpg: Uint8Array; merknad?: string }, ekstra = {}) {
  const innhold = lagRapportInnhold(result, { ...valg, ...ekstra });
  const pdf = await lagPdfRapport(innhold, LOGO, bilde);
  const sider = await pdfTekst(pdf.bytes);
  return { innhold, pdf, sider, alt: sider.join("\n") };
}

describe("innhold fra analyseresultatet", () => {
  it("bruker artsbibliotekets navn, latin, alvorlighet og tiltak – ingen prosenter", () => {
    const i = lagRapportInnhold(husmus(), valg);
    expect(i.navn).toBe("Husmus");
    expect(i.latin).toBe("Mus musculus");
    expect(i.sikkerhet?.etikett).toBe("Høy sikkerhet");
    expect(i.risiko.etikett).toBe("Bør følges opp");
    expect(i.tiltak.length).toBeGreaterThan(0);
    expect(i.alternativer[0]).toMatchObject({ navn: "Brunrotte", latin: "Rattus norvegicus", sikkerhet: "Lav sikkerhet" });
    expect(JSON.stringify(i)).not.toMatch(/\d+ ?%|prosent/);
    expect(i.aiForbehold).toBe(AI_FORBEHOLD);
    expect(i.filnavn).toBe("artsorakel-rapport-2026-11-04-husmus.pdf");
  });

  it("filnavn uten æ, ø og å", () => {
    expect(filnavnDel("Mulig Rød skogsmaur")).toBe("mulig-rod-skogsmaur");
    expect(filnavnDel("Ærfugl på Øya – Åsen")).toBe("aerfugl-pa-oya-asen");
  });
});

describe("tegnsett og tekstbryting", () => {
  it("beholder æ, ø, å, «» og tankestrek, og erstatter tegn Helvetica mangler", () => {
    expect(tilWinAnsi("Bør håndteres raskt – «Ærlig» Øst")).toBe("Bør håndteres raskt – «Ærlig» Øst");
    // «×» finnes i Helvetica og beholdes; pil og ≈ gjør det ikke
    expect(tilWinAnsi("mus → rotte ≈ 5 mm × 2")).toBe("mus -> rotte ca.  5 mm × 2");
    expect(tilWinAnsi("kl. 20:37")).toBe("kl. 20:37");
  });
});

describe("PDF-rapport", () => {
  it("skadedyr: toppfelt, tittel, dato, identifikasjon, tiltak, forbehold og bunntekst", async () => {
    const { pdf, alt, sider } = await lag(husmus(), { jpg: await jpeg(1200, 900) }, { sted: "kjeller" });
    expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
    expect(alt).toContain("Artsorakel – analyserapport");
    expect(alt).toContain("AI-GENERERT · VEILEDENDE");
    expect(alt).toMatch(/Analysert: 4\. november 2026/);
    expect(alt).toContain("Oppgitt funnsted: Kjeller");
    expect(alt).toContain("Husmus");
    expect(alt).toContain("Mus musculus");
    expect(alt).toContain("Sikkerhet i bestemmelsen: Høy sikkerhet");
    expect(alt).toContain("Bør følges opp");
    expect(alt).toContain("Anbefalte tiltak");
    expect(alt).toContain("Når bør du kontakte fagfolk?");
    // Forbeholdet i ett stykke (kan være brutt over linjer)
    expect(alt.replace(/\n/g, " ")).toContain(AI_FORBEHOLD);
    expect(alt).toContain("Den er ikke signert og er ikke en inspeksjonsrapport.");
    sider.forEach((s, i) => {
      expect(s).toContain(`Side ${i + 1} av ${sider.length}`);
      expect(s).toContain("Ocab Artsorakel");
      expect(s).toContain("Rapportdato: 04.11.2026");
      expect(s).toMatch(/AI-generert og veiledende/);
    });
  });

  it("æ, ø og å ligger riktig kodet i PDF-en", async () => {
    const { alt } = await lag(dyr({ found: true, name: "Rød skogsmaur", latinName: "Formica rufa", description: "Tofarget maur, rød mellomkropp og svart bakkropp. Ærlig talt – større enn vanlig.", confidence: 80 }, "Maur"));
    for (const ord of ["Rød skogsmaur", "Ærlig", "Når bør du kontakte fagfolk?", "Slik skiller du den fra liknende arter", "Utbredelse i Norge"]) {
      expect(alt).toContain(ord);
    }
  });

  it("bildet strekkes aldri – proporsjonene beholdes for høye og brede bilder", async () => {
    for (const [b, h] of [[1200, 1800], [1600, 400], [300, 300]]) {
      const { pdf } = await lag(husmus(), { jpg: await jpeg(b, h) });
      const r = pdf.bildeRamme!;
      expect(r.bredde / r.hoyde).toBeCloseTo(b / h, 3);
      expect(r.bredde).toBeLessThanOrEqual(595.28 - 100 + 0.01);
      expect(r.hoyde).toBeLessThanOrEqual(290 + 0.01);
    }
  });

  it("ekskrementer: type, bekreftelse og ekskrementforbehold", async () => {
    const r = enrich({ found: true, name: "Mus", latinName: "Mus musculus", description: "Små, spisse ekskrementer.", observasjon: "4–6 mm, spredt", confidence: 85, alternativer: [] }, "Ekskrementer");
    const { alt } = await lag(r, { jpg: await jpeg(1000, 750) });
    expect(alt).toContain("Type: Ekskrementer");
    expect(alt.replace(/\n/g, " ")).toContain("ikke en laboratorieprøve");
    if (r.bekreftelse?.length) expect(alt).toContain("Slik bekrefter du funnet");
    expect(alt).toContain("Trygg opprydding");
    expect(alt.replace(/\n/g, " ")).toContain("Ikke fei eller støvsug");
  });

  it("usikker og «Ukjent»: ingen alvorlighet eller sikker art, men forbehold og råd", async () => {
    const ukjent = enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "Bildet er for uskarpt.", confidence: 0 }, "Maur");
    const { alt, innhold } = await lag(ukjent);
    expect(innhold.latin).toBeUndefined();
    expect(innhold.risiko.etikett).toBeUndefined();
    expect(alt).toContain("Kunne ikke identifisere funnet sikkert");
    expect(alt).toContain("Ingen alvorlighetsvurdering");
    expect(alt).not.toContain("Sikkerhet i bestemmelsen");
    expect(alt).toContain("Bildet er ikke tilgjengelig for denne rapporten.");
    expect(alt.replace(/\n/g, " ")).toContain(AI_FORBEHOLD);

    const mulig = enrich({ found: true, name: "Stokkmaur", latinName: "Camponotus spp.", description: "Stor maur.", confidence: 35 }, "Maur");
    const m = await lag(mulig);
    expect(m.alt).toContain("Mulig Stokkmaur");
    expect(m.alt).toContain("Lav sikkerhet");
    expect(m.alt.replace(/\n/g, " ")).toContain("bør bestemmelsen bekreftes av en fagperson");
  });

  it("lange norske tekster: flere sider, ingenting utenfor margene, lange ord deles", async () => {
    const lang = "Stokkmaurangrep i bygningskonstruksjoner kan være omfattende, og det er viktig å undersøke vinduskarmer, bunnsviller, takutstikk og isolasjon nøye. ";
    const r: AnalysisResult = {
      ...dyr({ found: true, name: "Stokkmaur", latinName: "Camponotus spp.", description: lang.repeat(12), observasjon: lang.repeat(4), confidence: 70, alternativer: [
        { name: "Rød skogsmaur", latinName: "Formica rufa-gruppen", confidence: 30, hvorfor: lang.repeat(3) },
        { name: "Svart tremaur", latinName: "Lasius fuliginosus", confidence: 20, hvorfor: lang },
      ] }, "Maur"),
    };
    r.tiltak = [...r.tiltak, ...Array.from({ length: 12 }, (_, i) => `${i + 1}. ${lang}`), "Sammensattordsomerekstremtlangtogikkefårplasspåénlinjeiheletattelleriallefall".repeat(3)];
    const { pdf, sider } = await lag(r, { jpg: await jpeg(1200, 1800) });
    expect(pdf.sider).toBeGreaterThanOrEqual(3);
    expect(sider).toHaveLength(pdf.sider);
    expect(sider[1]).toContain("Artsorakel – analyserapport (forts.)");

    // Alle tekstlinjer holder seg innenfor bredden
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (const l of brytTekst(r.tiltak.at(-1)!, font, 10.5, 479)) {
      expect(font.widthOfTextAtSize(l, 10.5)).toBeLessThanOrEqual(479);
    }
  });

  it("annen art og miniatyrbilde fra historikken merkes tydelig", async () => {
    const r = enrich({ found: false, name: "Ukjent", latinName: "Ukjent", description: "x", confidence: 0, annenArt: { name: "Hare", latinName: "Lepus timidus", confidence: 70, hvorfor: "Lange ører og kraftige bakbein." } }, "Andre pattedyr");
    const { alt: raa } = await lag(r, { jpg: await jpeg(160, 120), merknad: "Miniatyrbilde fra historikken på denne enheten. Originalbildet lagres ikke." }, { eldreArtsdata: true });
    const alt = raa.replace(/\n/g, " ");
    expect(alt).toContain("Ikke i Ocabs database – forslaget kommer fra AI-en alene");
    expect(alt).toContain("Miniatyrbilde fra historikken");
    expect(alt).toContain("Artsopplysninger kan ha blitt oppdatert siden denne analysen ble utført.");
  });
});

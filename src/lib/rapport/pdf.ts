/**
 * Bygger PDF-rapporten med pdf-lib. Kjører helt lokalt (i nettleseren, og i
 * Node i testene) – bildet sendes aldri til noen PDF-tjeneste.
 *
 * Skrift: Helvetica (standardskrift i alle PDF-lesere). Den dekker æ, ø og å
 * og vanlig norsk tegnsetting. Tegn den ikke har (piler, ≈ o.l.) byttes til
 * nærmeste lesbare tegn, så ingen tekst forsvinner eller gir feil.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import type { RapportInnhold } from "./innhold";

export interface RapportBilde {
  /** JPEG-data. */
  jpg: Uint8Array;
  /** Tekst under bildet, f.eks. at det er et miniatyrbilde. */
  merknad?: string;
}

export interface PdfResultat {
  bytes: Uint8Array;
  sider: number;
  /** Størrelsen bildet ble tegnet med (pt), for testene. */
  bildeRamme?: { bredde: number; hoyde: number; kildeBredde: number; kildeHoyde: number };
}

// ── Side og farger ───────────────────────────────────────────────────────
const SIDE = { bredde: 595.28, hoyde: 841.89 }; // A4
const MARG = { venstre: 50, hoyre: 50, topp: 46, bunn: 70 };
const INNHOLD_BREDDE = SIDE.bredde - MARG.venstre - MARG.hoyre;
const BILDE_MAKS_HOYDE = 290;

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const FARGE = {
  ocab900: hex("#003366"),
  ocab500: hex("#2f5f96"),
  ocab50: hex("#e8f0f8"),
  signal500: hex("#ff6b00"),
  signal100: hex("#ffe6d2"),
  tekst: hex("#1b2430"),
  dempet: hex("#55606e"),
  linje: hex("#d6dde6"),
  flate: hex("#f3f6f9"),
  hvit: rgb(1, 1, 1),
  lav: hex("#2e7d5b"),
  middels: hex("#b8770a"),
  hoy: hex("#b3261e"),
};

// ── Tegnsett ─────────────────────────────────────────────────────────────
/** Tegn utenfor Latin-1 som WinAnsi (Helvetica) likevel har. */
const WINANSI_EKSTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const ERSTATNING: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "≈": "ca. ",
  "≥": ">=",
  "≤": "<=",
  "×": "x",
  "−": "-",
  "‐": "-",
  "‑": "-",
  "′": "'",
  "″": '"',
  " ": " ",
  " ": " ",
  " ": " ",
  "​": "",
  "­": "",
};

/** Gjør teksten trygg for Helvetica (WinAnsi). æ, ø, å og «» beholdes. */
export function tilWinAnsi(tekst: string): string {
  let ut = "";
  for (const tegn of tekst.normalize("NFC")) {
    const kode = tegn.codePointAt(0)!;
    if (tegn === "\n" || tegn === "\t") ut += tegn === "\t" ? " " : "\n";
    else if ((kode >= 0x20 && kode <= 0x7e) || (kode >= 0xa0 && kode <= 0xff) || WINANSI_EKSTRA.has(tegn)) ut += tegn;
    else if (tegn in ERSTATNING) ut += ERSTATNING[tegn];
    else {
      // Fjern aksenter (f.eks. ő → o); ellers et nøytralt tegn.
      const base = tegn.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const k = base.codePointAt(0) ?? 0;
      ut += base.length === 1 && k >= 0x20 && k <= 0xff ? base : k < 0x20 ? "" : "?";
    }
  }
  return ut;
}

// ── Tekstbryting ─────────────────────────────────────────────────────────
/** Bryter tekst til linjer som får plass i bredden. Svært lange ord deles. */
export function brytTekst(tekst: string, font: PDFFont, storrelse: number, bredde: number): string[] {
  const linjer: string[] = [];
  for (const avsnitt of tilWinAnsi(tekst).split("\n")) {
    const ord = avsnitt.split(/ +/).filter(Boolean);
    let linje = "";
    for (let o of ord) {
      // Del ord som er lengre enn hele bredden (f.eks. lange lenker).
      while (font.widthOfTextAtSize(o, storrelse) > bredde) {
        let n = o.length - 1;
        while (n > 1 && font.widthOfTextAtSize(o.slice(0, n), storrelse) > bredde) n--;
        if (linje) {
          linjer.push(linje);
          linje = "";
        }
        linjer.push(o.slice(0, n));
        o = o.slice(n);
      }
      const forsok = linje ? `${linje} ${o}` : o;
      if (font.widthOfTextAtSize(forsok, storrelse) <= bredde) linje = forsok;
      else {
        if (linje) linjer.push(linje);
        linje = o;
      }
    }
    linjer.push(linje);
  }
  return linjer;
}

// ── Oppsett ──────────────────────────────────────────────────────────────
interface Fonter {
  normal: PDFFont;
  fet: PDFFont;
  kursiv: PDFFont;
}

class Oppsett {
  sider: PDFPage[] = [];
  side!: PDFPage;
  y = 0;

  constructor(
    private doc: PDFDocument,
    private f: Fonter,
    private innhold: RapportInnhold,
    private logo: PDFImage
  ) {
    this.nySide();
  }

  private get bunn() {
    return MARG.bunn;
  }

  nySide() {
    this.side = this.doc.addPage([SIDE.bredde, SIDE.hoyde]);
    this.sider.push(this.side);
    this.y = SIDE.hoyde - MARG.topp;
    if (this.sider.length === 1) this.toppfelt();
    else this.fortsettelse();
  }

  /** Sørg for plass; ellers ny side. */
  plass(hoyde: number) {
    if (this.y - hoyde < this.bunn) this.nySide();
  }

  private toppfelt() {
    const logoHoyde = 30;
    const logoBredde = (this.logo.width / this.logo.height) * logoHoyde;
    this.side.drawImage(this.logo, { x: MARG.venstre, y: this.y - logoHoyde, width: logoBredde, height: logoHoyde });
    this.merkelapp("AI-GENERERT · VEILEDENDE", SIDE.bredde - MARG.hoyre, this.y - 20);
    this.y -= logoHoyde + 22;
    this.side.drawText(tilWinAnsi(this.innhold.tittel), { x: MARG.venstre, y: this.y - 18, size: 20, font: this.f.fet, color: FARGE.ocab900 });
    this.y -= 34;
    this.tekstLinje(`Analysert: ${this.innhold.analyseDato}`, 9.5, this.f.normal, FARGE.dempet);
    if (this.innhold.funnsted) this.tekstLinje(`Oppgitt funnsted: ${this.innhold.funnsted}`, 9.5, this.f.normal, FARGE.dempet);
    this.y -= 8;
    this.side.drawRectangle({ x: MARG.venstre, y: this.y, width: INNHOLD_BREDDE, height: 2, color: FARGE.ocab900 });
    this.side.drawRectangle({ x: MARG.venstre, y: this.y, width: 56, height: 2, color: FARGE.signal500 });
    this.y -= 20;
  }

  private fortsettelse() {
    const logoHoyde = 16;
    const logoBredde = (this.logo.width / this.logo.height) * logoHoyde;
    this.side.drawImage(this.logo, { x: MARG.venstre, y: this.y - logoHoyde, width: logoBredde, height: logoHoyde });
    const t = tilWinAnsi(`${this.innhold.tittel} (forts.)`);
    this.side.drawText(t, {
      x: SIDE.bredde - MARG.hoyre - this.f.normal.widthOfTextAtSize(t, 9),
      y: this.y - 12,
      size: 9,
      font: this.f.normal,
      color: FARGE.dempet,
    });
    this.y -= logoHoyde + 10;
    this.side.drawRectangle({ x: MARG.venstre, y: this.y, width: INNHOLD_BREDDE, height: 1, color: FARGE.linje });
    this.y -= 18;
  }

  /** Liten etikett med ramme, høyrejustert til x. */
  private merkelapp(tekst: string, hoyreX: number, y: number) {
    const s = 7.5;
    const b = this.f.fet.widthOfTextAtSize(tekst, s) + 14;
    this.side.drawRectangle({ x: hoyreX - b, y: y - 4, width: b, height: 16, borderColor: FARGE.signal500, borderWidth: 1, color: FARGE.hvit });
    this.side.drawText(tekst, { x: hoyreX - b + 7, y: y + 1, size: s, font: this.f.fet, color: FARGE.signal500 });
  }

  tekstLinje(tekst: string, storrelse: number, font: PDFFont, farge: RGB) {
    for (const l of brytTekst(tekst, font, storrelse, INNHOLD_BREDDE)) {
      this.plass(storrelse * 1.45);
      this.side.drawText(l, { x: MARG.venstre, y: this.y - storrelse, size: storrelse, font, color: farge });
      this.y -= storrelse * 1.45;
    }
  }

  /** Avsnitt med valgfritt innrykk. */
  avsnitt(tekst: string, valg: { storrelse?: number; font?: PDFFont; farge?: RGB; innrykk?: number; luftEtter?: number } = {}) {
    const storrelse = valg.storrelse ?? 10.5;
    const font = valg.font ?? this.f.normal;
    const innrykk = valg.innrykk ?? 0;
    const linjeHoyde = storrelse * 1.45;
    for (const l of brytTekst(tekst, font, storrelse, INNHOLD_BREDDE - innrykk)) {
      this.plass(linjeHoyde);
      this.side.drawText(l, { x: MARG.venstre + innrykk, y: this.y - storrelse, size: storrelse, font, color: valg.farge ?? FARGE.tekst });
      this.y -= linjeHoyde;
    }
    this.y -= valg.luftEtter ?? 6;
  }

  overskrift(tekst: string) {
    // Hold overskriften sammen med minst to linjer tekst.
    this.plass(18 + 10.5 * 1.45 * 2);
    this.y -= 6;
    this.side.drawText(tilWinAnsi(tekst), { x: MARG.venstre, y: this.y - 12, size: 12, font: this.f.fet, color: FARGE.ocab900 });
    this.y -= 22;
  }

  punktliste(punkter: string[], punktFarge: RGB = FARGE.signal500) {
    const storrelse = 10.5;
    const linjeHoyde = storrelse * 1.45;
    for (const p of punkter) {
      const linjer = brytTekst(p, this.f.normal, storrelse, INNHOLD_BREDDE - 16);
      linjer.forEach((l, i) => {
        this.plass(linjeHoyde);
        if (i === 0) this.side.drawCircle({ x: MARG.venstre + 4, y: this.y - storrelse * 0.62, size: 2, color: punktFarge });
        this.side.drawText(l, { x: MARG.venstre + 16, y: this.y - storrelse, size: storrelse, font: this.f.normal, color: FARGE.tekst });
        this.y -= linjeHoyde;
      });
      this.y -= 3;
    }
    this.y -= 4;
  }

  /** Tekstboks med farget kant. Blir den for lang for en side, flyter teksten uten boks. */
  boks(tekst: string, valg: { bakgrunn: RGB; kant: RGB; storrelse?: number; font?: PDFFont; tittel?: string }) {
    const storrelse = valg.storrelse ?? 10;
    const font = valg.font ?? this.f.normal;
    const linjeHoyde = storrelse * 1.45;
    const indre = INNHOLD_BREDDE - 28;
    const linjer = brytTekst(tekst, font, storrelse, indre);
    const tittelHoyde = valg.tittel ? 16 : 0;
    const hoyde = linjer.length * linjeHoyde + tittelHoyde + 18;
    if (hoyde > SIDE.hoyde - MARG.topp - MARG.bunn - 60) {
      if (valg.tittel) this.overskrift(valg.tittel);
      this.avsnitt(tekst, { storrelse, font });
      return;
    }
    this.plass(hoyde);
    const topp = this.y;
    this.side.drawRectangle({ x: MARG.venstre, y: topp - hoyde, width: INNHOLD_BREDDE, height: hoyde, color: valg.bakgrunn });
    this.side.drawRectangle({ x: MARG.venstre, y: topp - hoyde, width: 3, height: hoyde, color: valg.kant });
    let y = topp - 10;
    if (valg.tittel) {
      this.side.drawText(tilWinAnsi(valg.tittel), { x: MARG.venstre + 16, y: y - 10, size: 10.5, font: this.f.fet, color: FARGE.ocab900 });
      y -= tittelHoyde;
    }
    for (const l of linjer) {
      this.side.drawText(l, { x: MARG.venstre + 16, y: y - storrelse, size: storrelse, font, color: FARGE.tekst });
      y -= linjeHoyde;
    }
    this.y = topp - hoyde - 12;
  }

  bilde(bilde: PDFImage, merknad?: string): { bredde: number; hoyde: number } {
    const skala = Math.min(INNHOLD_BREDDE / bilde.width, BILDE_MAKS_HOYDE / bilde.height, 1.6);
    const bredde = bilde.width * skala;
    const hoyde = bilde.height * skala;
    this.plass(hoyde + (merknad ? 20 : 8));
    const x = MARG.venstre + (INNHOLD_BREDDE - bredde) / 2;
    this.side.drawRectangle({ x: x - 1, y: this.y - hoyde - 1, width: bredde + 2, height: hoyde + 2, color: FARGE.linje });
    this.side.drawImage(bilde, { x, y: this.y - hoyde, width: bredde, height: hoyde });
    this.y -= hoyde + 8;
    if (merknad) this.avsnitt(merknad, { storrelse: 8.5, farge: FARGE.dempet, luftEtter: 2 });
    this.y -= 8;
    return { bredde, hoyde };
  }

  pille(tekst: string, farge: RGB) {
    const s = 9.5;
    const t = tilWinAnsi(tekst);
    const b = this.f.fet.widthOfTextAtSize(t, s) + 20;
    this.plass(22);
    this.side.drawRectangle({ x: MARG.venstre, y: this.y - 18, width: b, height: 18, color: farge });
    this.side.drawText(t, { x: MARG.venstre + 10, y: this.y - 12.5, size: s, font: this.f.fet, color: FARGE.hvit });
    this.y -= 26;
  }

  /** Bunntekst med sidetall på alle sider – tegnes til slutt, når antallet er kjent. */
  bunntekster() {
    const antall = this.sider.length;
    this.sider.forEach((side, i) => {
      const y = 40;
      side.drawRectangle({ x: MARG.venstre, y: y + 14, width: INNHOLD_BREDDE, height: 0.75, color: FARGE.linje });
      side.drawText("Ocab Artsorakel", { x: MARG.venstre, y, size: 8, font: this.f.fet, color: FARGE.ocab900 });
      const merknad = tilWinAnsi(" · AI-generert og veiledende – ikke en bekreftet artsbestemmelse");
      side.drawText(merknad, {
        x: MARG.venstre + this.f.fet.widthOfTextAtSize("Ocab Artsorakel", 8),
        y,
        size: 8,
        font: this.f.normal,
        color: FARGE.dempet,
      });
      side.drawText(tilWinAnsi(`Rapportdato: ${this.innhold.rapportDatoKort}`), { x: MARG.venstre, y: y - 11, size: 8, font: this.f.normal, color: FARGE.dempet });
      const sidetall = `Side ${i + 1} av ${antall}`;
      side.drawText(sidetall, {
        x: SIDE.bredde - MARG.hoyre - this.f.normal.widthOfTextAtSize(sidetall, 8),
        y: y - 11,
        size: 8,
        font: this.f.normal,
        color: FARGE.dempet,
      });
    });
  }
}

const ALVORLIGHET_FARGE: Record<string, RGB> = {
  "Lite alvorlig": FARGE.lav,
  "Bør følges opp": FARGE.middels,
  "Bør håndteres raskt": FARGE.hoy,
};

/** Lager PDF-rapporten. `logoPng` er Ocabs offisielle logo fra public/icons. */
export async function lagPdfRapport(innhold: RapportInnhold, logoPng: Uint8Array, bilde?: RapportBilde): Promise<PdfResultat> {
  const doc = await PDFDocument.create();
  doc.setTitle(tilWinAnsi(`${innhold.tittel}: ${innhold.navn}`));
  doc.setAuthor("Ocab Artsorakel");
  doc.setSubject("AI-generert og veiledende analyserapport");
  doc.setCreator("Ocab Artsorakel");
  doc.setProducer("Ocab Artsorakel");
  doc.setLanguage("nb-NO");

  const f: Fonter = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    fet: await doc.embedFont(StandardFonts.HelveticaBold),
    kursiv: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const logo = await doc.embedPng(logoPng);
  const o = new Oppsett(doc, f, innhold, logo);

  // 1. Identifikasjon
  o.avsnitt("FORESLÅTT FUNN", { storrelse: 8.5, font: f.fet, farge: FARGE.dempet, luftEtter: 0 });
  o.avsnitt(innhold.navn, { storrelse: 22, font: f.fet, farge: FARGE.ocab900, luftEtter: 0 });
  if (innhold.latin) o.avsnitt(innhold.latin, { storrelse: 12.5, font: f.kursiv, farge: FARGE.dempet, luftEtter: 2 });
  if (innhold.type) o.avsnitt(innhold.type === "Ekskrementer" ? "Type: Ekskrementer" : `Gruppe: ${innhold.type}`, { storrelse: 9.5, farge: FARGE.dempet });
  if (innhold.risiko.etikett) o.pille(innhold.risiko.etikett, ALVORLIGHET_FARGE[innhold.risiko.etikett] ?? FARGE.ocab500);
  for (const m of innhold.merknader) o.avsnitt(m, { storrelse: 9.5, farge: FARGE.dempet });

  // 2. Bildet
  let bildeRamme: PdfResultat["bildeRamme"];
  if (bilde) {
    try {
      const img = await doc.embedJpg(bilde.jpg);
      const { bredde, hoyde } = o.bilde(img, bilde.merknad);
      bildeRamme = { bredde, hoyde, kildeBredde: img.width, kildeHoyde: img.height };
    } catch {
      o.avsnitt("Bildet kunne ikke legges inn i rapporten.", { storrelse: 9, farge: FARGE.dempet });
    }
  } else {
    o.avsnitt("Bildet er ikke tilgjengelig for denne rapporten.", { storrelse: 9, farge: FARGE.dempet });
  }

  // 3. Påkrevd forbehold – tydelig, tidlig i rapporten
  o.boks(innhold.aiForbehold, { bakgrunn: FARGE.signal100, kant: FARGE.signal500, tittel: "Viktig: veiledende AI-vurdering" });

  // 4. Vurdering og sikkerhet
  o.overskrift("Vurdering");
  o.avsnitt(innhold.beskrivelse);
  if (innhold.grunnlag) o.avsnitt(`Forslaget bygger på: ${innhold.grunnlag}`, { farge: FARGE.dempet });
  if (innhold.sikkerhet) {
    // Hold etiketten og forklaringen sammen på samme side.
    o.plass(10.5 * 1.45 + brytTekst(innhold.sikkerhet.forklaring, f.normal, 9.5, INNHOLD_BREDDE).length * 9.5 * 1.45 + 6);
    o.avsnitt(`Sikkerhet i bestemmelsen: ${innhold.sikkerhet.etikett}`, { font: f.fet, luftEtter: 0 });
    o.avsnitt(innhold.sikkerhet.forklaring, { storrelse: 9.5, farge: FARGE.dempet });
  }

  if (innhold.alternativer.length) {
    o.overskrift("Kan også være");
    for (const a of innhold.alternativer) {
      o.plass(10.5 * 1.45 + (a.hvorfor ? brytTekst(a.hvorfor, f.normal, 9.5, INNHOLD_BREDDE).length * 9.5 * 1.45 : 0) + 6);
      const linje = [a.navn, a.latin ? `(${a.latin})` : "", a.sikkerhet ? `– ${a.sikkerhet.toLowerCase()}` : ""].filter(Boolean).join(" ");
      o.avsnitt(linje, { font: f.fet, luftEtter: 0 });
      if (a.hvorfor) o.avsnitt(a.hvorfor, { storrelse: 9.5, farge: FARGE.dempet, innrykk: 0 });
    }
  }

  // 5. Risikovurdering
  o.overskrift("Risikovurdering");
  if (innhold.risiko.etikett) o.avsnitt(`Alvorlighet: ${innhold.risiko.etikett}. ${innhold.risiko.tekst ?? ""}`.trim());
  else o.avsnitt("Ingen alvorlighetsvurdering: funnet er ikke bestemt til en art i Ocabs database.", { farge: FARGE.dempet });
  if (innhold.risiko.forbehold) o.boks(innhold.risiko.forbehold, { bakgrunn: FARGE.flate, kant: FARGE.middels });
  if (innhold.risiko.notat) o.boks(innhold.risiko.notat, { bakgrunn: FARGE.ocab50, kant: FARGE.ocab500 });
  if (innhold.omArten.utbredelse) o.avsnitt(`Utbredelse i Norge: ${innhold.omArten.utbredelse}`, { storrelse: 10 });
  if (innhold.omArten.sesong) o.avsnitt(`Når den er aktiv: ${innhold.omArten.sesong}`, { storrelse: 10 });

  // 6. Tiltak
  if (innhold.tiltak.length) {
    o.overskrift("Anbefalte tiltak");
    o.punktliste(innhold.tiltak);
  }
  if (innhold.bekreftelse.length) {
    o.overskrift("Slik bekrefter du funnet");
    o.punktliste(innhold.bekreftelse, FARGE.ocab500);
  }
  o.overskrift("Når bør du kontakte fagfolk?");
  o.punktliste(innhold.fagfolk, FARGE.ocab500);

  if (innhold.forveksles.length) {
    o.overskrift("Slik skiller du den fra liknende arter");
    o.punktliste(innhold.forveksles, FARGE.dempet);
  }

  // 7. Forbehold
  o.overskrift("Forbehold");
  for (const t of innhold.forbehold) o.avsnitt(t, { storrelse: 9.5 });
  o.avsnitt(innhold.aiForbehold, { storrelse: 9.5, font: f.fet });
  if (innhold.kilde) o.avsnitt(`Les mer i FHIs skadedyrhåndbok: ${innhold.kilde}`, { storrelse: 9, farge: FARGE.dempet });
  o.avsnitt(`Rapporten ble laget ${innhold.rapportDato}. Den er ikke signert og er ikke en inspeksjonsrapport.`, { storrelse: 9, farge: FARGE.dempet });

  o.bunntekster();
  const bytes = await doc.save();
  return { bytes, sider: o.sider.length, bildeRamme };
}

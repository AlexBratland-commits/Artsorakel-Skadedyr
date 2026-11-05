import {
  generelltNavnOmfang,
  findPest,
  findPestInGroup,
  pestsInGroup,
  fhiUrl,
  type Pest,
  type PestGroup,
} from "@/lib/pests";
import type { AnalysisResult, AnnenArt, Candidate, Severity } from "@/lib/types";

/**
 * Identifiseringslogikken etter AI-svaret: tolker svaret, slår opp arten i
 * artsbiblioteket og beriker resultatet med bibliotekets egne opplysninger
 * (alvorlighet, tiltak, forvekslinger). Ingen AI-kall og ingen prompter her –
 * promptene ligger i src/app/api/analyze/route.ts.
 */

/** Under denne sikkerheten behandles selv en navngitt kandidat som "Ukjent". */
export const MIN_CONFIDENCE = 30;
/** Under denne sikkerheten merkes navnet med "Mulig " i visningen. */
export const LOW_CONFIDENCE_LABEL = 50;

/**
 * F1: forklaring når et ekskrementfunn ikke kan bestemmes sikkert (godkjent tekst).
 * Overskriften «Kunne ikke identifisere funnet sikkert» settes i visningen.
 */
export const EKSKREMENT_UKJENT_TEKST =
  "Bildet eller opplysningene gir ikke tilstrekkelig grunnlag for å bestemme hvilket dyr sporene stammer fra. Prøv et tydeligere bilde med målestokk.";

/** F4: faglig forbehold for rotteekskrementer (godkjent i leveranse B). */
export const ROTTE_FORBEHOLD =
  "Ekskrementer alene gir ikke alltid sikkert grunnlag for å skille brunrotte fra svartrotte. I Norge er brunrotte langt vanligst.";

/**
 * Mus- og flaggermusekskrementer er like store. Forbeholdet bygger på
 * bibliotekets egne kjennetegn (konsistens og innhold).
 */
export const MUS_FLAGGERMUS_FORBEHOLD =
  "Flaggermusekskrementer består av insektrester og er tørre og smuldrer lett. Museekskrementer er faste og harde. Ikke ta på eller knus ekskrementene – vurder heller utseendet på bildet, og kontakt Ocab ved tvil.";

/** Tekst når bildet tydelig viser noe annet enn et skadedyr (oppgave 4). */
export const IKKE_SKADEDYR_TEKST =
  "Bildet ser ut til å vise en gjenstand eller noe annet enn et skadedyr eller spor etter skadedyr.";

/** Høyeste sikkerhet når arten bare er utledet av et generelt ord som «rotte» (under «Høy»). */
const MAKS_VED_GENERELT_NAVN = 79;

/**
 * F3: tolker modellens sikkerhet robust. «85%», «85 %», «0,85» og 0.85 gir 85.
 * Mangler tallet eller er det uleselig, gir det MIN_CONFIDENCE (lav – «Mulig …»)
 * i stedet for et oppdiktet tall.
 */
export function tolkSikkerhet(verdi: unknown): number {
  return tolkProsent(verdi) ?? MIN_CONFIDENCE;
}

/**
 * Felles tolking av en prosent fra modellen (M3, revisjon): hovedforslag,
 * alternativer og «annen art» tolkes likt. Gir undefined hvis tallet mangler.
 */
export function tolkProsent(verdi: unknown): number | undefined {
  let n: number;
  if (typeof verdi === "number") n = verdi;
  else if (typeof verdi === "string") {
    const t = verdi.trim().replace(/\s*%$/, "").replace(",", ".");
    n = t === "" ? NaN : Number(t);
  } else n = NaN;
  if (!Number.isFinite(n)) return undefined;
  if (n > 0 && n < 1) n *= 100; // andel (0,85) i stedet for prosent
  return Math.min(100, Math.max(0, Math.round(n)));
}

export const UNKNOWN: AnalysisResult = {
  found: false,
  name: "Ukjent",
  latinName: "Ukjent",
  description: "Vi klarte ikke å artsbestemme dyret på dette bildet.",
  severity: "lav",
  fhiSlug: "ukjent",
  confidence: 0,
  tiltak: [
    "Ta et nytt bilde nærmere dyret, med god belysning og skarpt fokus",
    "Legg noe kjent ved siden av for størrelse, for eksempel en mynt eller fyrstikk",
    "Oppgi hvor du fant dyret – det skiller arter som ligner på hverandre",
  ],
  alternativer: [],
  fhiUrl: fhiUrl(),
};

/** Samme råd som for ukjente dyr, men om ekskrementene brukeren fotograferte. */
export const EKSKREMENT_UKJENT_TILTAK = [
  "Ta et nytt bilde nærmere ekskrementene, med god belysning og skarpt fokus",
  "Legg noe kjent ved siden av for størrelse, for eksempel en mynt eller fyrstikk",
  "Oppgi hvor du fant ekskrementene – det skiller arter som ligner på hverandre",
];

export function parseJson(content: string): Record<string, unknown> | null {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}


/**
 * Slår opp modellens svar i databasen, først i gruppen steg 2 jobbet mot.
 * For dyr faller vi tilbake til hele listen i tilfelle steg 1 valgte feil
 * gruppe. For ekskrementer gjør vi ikke det – da kunne et dyr som er bevisst
 * utelatt der (svartrotte) slippe inn via dyre-oppføringen.
 */
export function lookupPest(name: string, latinName: string, gruppe: PestGroup | null): Pest | undefined {
  return slaaOpp(name, latinName, gruppe).pest;
}

/** Resultatet av å slå opp norsk og vitenskapelig navn hver for seg (H1). */
interface Oppslag {
  pest?: Pest;
  /** Navnene peker på to forskjellige arter: [etter norsk navn, etter latinsk navn]. */
  motstrid?: [Pest, Pest];
  /** Arten som det vitenskapelige navnet alene peker på (undefined hvis ukjent). */
  etterLatin?: Pest;
  /** Arten kom bare fra et generelt navn («mus»), uten vitenskapelig navn som bekrefter den. */
  generelt?: boolean;
  /** Generelt navn + ukjent vitenskapelig navn: en art utenfor listen, ingen art velges. */
  utenforListen?: boolean;
}

const harLatin = (x: string) => x.trim() !== "" && !/^ukjent$/i.test(x.trim());

/**
 * H1: slår opp norsk og vitenskapelig navn hver for seg. Peker de på
 * forskjellige arter, velger vi ikke – da er svaret motstridende. Mangler
 * eller er det ene navnet ukjent, brukes det andre som før.
 */
function slaaOpp(name: string, latinName: string, gruppe: PestGroup | null): Oppslag {
  const iGruppe = (x: string) => (gruppe ? findPestInGroup(x, gruppe) : undefined);
  const utenfor = (x: string) => (gruppe === "Ekskrementer" ? viaDyreart(x) : findPest(x));
  const navnI = iGruppe(name);
  const latinI = iGruppe(latinName);
  const etterNavn = navnI ?? utenfor(name);
  const etterLatin = latinI ?? utenfor(latinName);

  // Generelt norsk navn (ikke ekskrementer): det vitenskapelige navnet avgjør hvilken art innenfor navnet.
  const omfang = gruppe === "Ekskrementer" || etterNavn?.gruppe === "Ekskrementer" ? undefined : generelltNavnOmfang(name);
  if (etterNavn && omfang) {
    if (etterLatin) {
      return omfang.includes(etterLatin.norsk) || etterLatin.latin === etterNavn.latin
        ? { pest: etterLatin, etterLatin }
        : { motstrid: [etterNavn, etterLatin], etterLatin };
    }
    return harLatin(latinName) ? { utenforListen: true } : { pest: etterNavn, generelt: true };
  }

  if (etterNavn && etterLatin && etterNavn.latin !== etterLatin.latin) {
    return { motstrid: [etterNavn, etterLatin], etterLatin };
  }
  return { pest: navnI ?? latinI ?? etterNavn ?? etterLatin, etterLatin };
}

/** H1: høyeste sikkerhet når bare et generelt navn peker på arten (alltid «Mulig …»). */
const MAKS_VED_GENERELT_ALIAS = LOW_CONFIDENCE_LABEL - 1;


/**
 * F4: et generelt navn som «Rotte» finnes ikke blant ekskrementene, men som
 * kallenavn på en dyreart (Brunrotte). Finnes det en ekskrementoppføring med
 * samme latinske navn, brukes den. Svartrotte har ingen ekskrementoppføring og
 * slipper derfor ikke inn denne veien. Artsbiblioteket er uendret.
 */
function viaDyreart(navn: string): Pest | undefined {
  const dyr = findPest(navn);
  if (!dyr || dyr.gruppe === "Ekskrementer") return undefined;
  return pestsInGroup("Ekskrementer").find((p) => p.latin === dyr.latin);
}

/** Var navnet modellen brukte noe annet enn artens eget norske eller latinske navn? */
function erGenereltNavn(name: string, latinName: string, pest: Pest): boolean {
  const n = (x: string) => x.toLowerCase().trim();
  return n(name) !== n(pest.norsk) && n(latinName) !== n(pest.latin);
}

/** Mapper modellens alternativ-liste til kjente arter, sortert fallende. */
export function parseAlternatives(raw: unknown, gruppe: PestGroup | null): Candidate[] {
  if (!Array.isArray(raw)) return [];
  const out: Candidate[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name : "";
    const latinName = typeof rec.latinName === "string" ? rec.latinName : "";
    // H1: et alternativ med motstridende navn forkastes – vi velger ikke art for modellen.
    const oppslag = slaaOpp(name, latinName, gruppe);
    const pest = oppslag.pest;
    if (!pest) continue;

    let confidence = tolkProsent(rec.confidence) ?? 0;
    if (oppslag.generelt) confidence = Math.min(confidence, MAKS_VED_GENERELT_ALIAS);

    const hvorfor = typeof rec.hvorfor === "string" ? rec.hvorfor.trim() : "";
    out.push({ name: pest.norsk, latinName: pest.latin, confidence, hvorfor });
  }

  out.sort((a, b) => b.confidence - a.confidence);
  return out;
}

/**
 * En art modellen kjenner igjen, men som ikke står i databasen. Navn som
 * finnes i databasen forkastes – da skulle modellen brukt listen, og det
 * hindrer også at bevisst utelatte arter (svartrotte på ekskrementer) slipper
 * inn den veien.
 */
export function parseAnnenArt(raw: unknown): AnnenArt | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const rec = raw as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim().slice(0, 80) : "";
  const latinName = typeof rec.latinName === "string" ? rec.latinName.trim().slice(0, 80) : "";
  if (!name || /^ukjent$/i.test(name)) return undefined;
  // Står den i biblioteket (eller er navnene motstridende), håndteres den av fraAnnenArt().
  if (fraAnnenArt(rec)) return undefined;

  const confidence = tolkProsent(rec.confidence);
  if (confidence === undefined || confidence < MIN_CONFIDENCE) return undefined;

  const hvorfor = typeof rec.hvorfor === "string" ? rec.hvorfor.trim().slice(0, 300) : "";
  return { name, latinName, confidence, hvorfor };
}

/**
 * Modellen kan finne på navn som ikke står i listen. Vi stoler bare på
 * identifikasjonen hvis den lar seg slå opp – ellers blir svaret Ukjent.
 * Alvorlighet, tiltak, utbredelse og sesong tar vi fra vår egen database,
 * ikke fra modellen.
 */
export function enrich(raw: Record<string, unknown>, gruppe: PestGroup | null): AnalysisResult {
  const name = typeof raw.name === "string" ? raw.name : "";
  const latinName = String(raw.latinName ?? "");
  const erEkskrementer = gruppe === "Ekskrementer";
  let pest = lookupPest(name, latinName, gruppe);
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description.trim()
      : "";
  const observasjon =
    typeof raw.observasjon === "string" && raw.observasjon.trim().length > 0
      ? raw.observasjon.trim()
      : undefined;

  let confidence = tolkSikkerhet(raw.confidence);
  const hovedOppslag = slaaOpp(name, latinName, gruppe);
  let motstrid = raw.found === false ? undefined : hovedOppslag.motstrid;
  let generelltNavn = pest && hovedOppslag.generelt ? name.trim() : undefined;
  // H1: generelt navn + ukjent vitenskapelig navn er en art utenfor listen – ingen art velges fra biblioteket.
  const utenforListen =
    raw.found !== false && hovedOppslag.utenforListen
      ? parseAnnenArt({ name: name.trim(), latinName: latinName.trim(), confidence: raw.confidence, hvorfor: "" })
      : undefined;

  // F2: står arten i biblioteket, men utenfor gruppen steg 1 valgte, kan
  // modellen ha meldt den som «annen art». Da godtas den fra biblioteket –
  // bare dyrearter, aldri ekskrementoppføringer, og bare med nok sikkerhet.
  if (raw.found === false) pest = undefined;
  if (!pest && !motstrid && !erEkskrementer) {
    const korrigert = fraAnnenArt(raw.annenArt);
    if (korrigert?.pest) {
      pest = korrigert.pest;
      confidence = korrigert.confidence;
      generelltNavn = korrigert.generelltNavn;
    } else if (korrigert?.motstrid) {
      motstrid = korrigert.motstrid;
      confidence = korrigert.confidence;
    }
  }

  if (motstrid) {
    return motstridResultat(motstrid, raw, { name, latinName, confidence, description, observasjon, gruppe });
  }

  if (!pest || confidence < MIN_CONFIDENCE) {
    // F1: på ekskrementer vises ingen artsnavn utenfor biblioteket – bare den
    // godkjente forklaringen. Det AI-en faktisk observerte, beholdes.
    if (erEkskrementer) {
      // M4 (revisjon): typen beholdes, så forbehold og råd passer til ekskrementer.
      return { ...UNKNOWN, gruppe: "Ekskrementer", tiltak: EKSKREMENT_UKJENT_TILTAK, description: EKSKREMENT_UKJENT_TEKST, observasjon };
    }
    const annenArt = utenforListen ?? parseAnnenArt(raw.annenArt);
    if (annenArt) {
      return {
        ...UNKNOWN,
        description: description || UNKNOWN.description,
        observasjon,
        annenArt,
        tiltak: [
          "Arten finnes ikke i Ocabs database, så vi har ingen kvalitetssikrede råd for den",
          "Kontakt Ocab hvis du er usikker, ser mange av dem eller de gjør skade",
          "Ta gjerne et nytt bilde nærmere dyret for å bekrefte",
        ],
        alternativer: parseAlternatives(raw.alternativer, gruppe),
      };
    }
    return { ...UNKNOWN, description: description || UNKNOWN.description, observasjon };
  }

  if (generelltNavn) confidence = Math.min(confidence, MAKS_VED_GENERELT_ALIAS);

  // F4: «rotte» alene gir ikke en sikker bestemmelse.
  if (erEkskrementer && pest.latin === "Rattus norvegicus" && erGenereltNavn(name, latinName, pest)) {
    confidence = Math.min(confidence, MAKS_VED_GENERELT_NAVN);
  }
  const forbehold = !erEkskrementer
    ? undefined
    : pest.latin === "Rattus norvegicus"
      ? ROTTE_FORBEHOLD
      : pest.norsk === "Mus" || pest.norsk === "Flaggermus"
        ? MUS_FLAGGERMUS_FORBEHOLD
        : undefined;

  const severity: Severity = pest.alvorlighet;
  const alternativer = parseAlternatives(raw.alternativer, gruppe).filter(
    (a) => a.name !== pest.norsk
  );

  return {
    found: true,
    name: pest.norsk,
    latinName: pest.latin,
    description: description || pest.kjennetegn,
    severity,
    fhiSlug: pest.slug,
    confidence,
    observasjon,
    alternativer,
    gruppe: pest.gruppe,
    tiltak: pest.tiltak,
    utbredelse: pest.utbredelse,
    sesong: pest.sesong,
    forveksles: pest.forveksles,
    usikkerKandidat: confidence < LOW_CONFIDENCE_LABEL,
    ...(generelltNavn ? { generelltNavn: generelltNavn.slice(0, 80) } : {}),
    bekreftelse: pest.bekreftelse,
    notat: pest.notat,
    forbehold,
    fhiUrl: fhiUrl(pest.slug),
  };
}

/**
 * Oppgave 4: grovsorteringen (steg 1) svarer «Ukjent» når den ikke ser noe
 * dyr. Fant heller ikke steg 2 noen art, viser bildet trolig en gjenstand.
 * Da droppes standardrådene om å fotografere dyret på nytt. Bruker bare
 * signalet den eksisterende prompten allerede gir – ingen promptendring.
 */
export function markerIkkeSkadedyr(result: AnalysisResult, stegEnGruppe: unknown): AnalysisResult {
  const ingenDyr = typeof stegEnGruppe === "string" && stegEnGruppe.trim().toLowerCase() === "ukjent";
  if (!ingenDyr || result.found || result.annenArt || result.motstrid) return result;
  const beskrivelse = result.description && result.description !== UNKNOWN.description ? result.description : IKKE_SKADEDYR_TEKST;
  return {
    ...result,
    ikkeSkadedyr: true,
    description: beskrivelse,
    tiltak: ["Gjelder det et skadedyr eller spor som ikke synes på dette bildet, ta et nytt bilde av selve funnet."],
  };
}

/**
 * F2: «annen art» som likevel står i biblioteket (som dyr). H1: oppgir
 * modellen et vitenskapelig navn som ikke står i biblioteket, er det en art
 * utenfor listen – da gjøres den ikke om til en art via et norsk alias
 * (f.eks. «Mus» + Apodemus agrarius blir ikke husmus). Motstridende navn
 * gir motstrid, aldri en valgt art.
 */
function fraAnnenArt(
  raw: unknown
): { pest?: Pest; motstrid?: [Pest, Pest]; confidence: number; generelltNavn?: string } | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const rec = raw as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name : "";
  const latinName = typeof rec.latinName === "string" ? rec.latinName : "";
  const oppslag = slaaOpp(name, latinName, null);
  const confidence = tolkSikkerhet(rec.confidence);
  if (confidence < MIN_CONFIDENCE || rec.confidence === undefined) return undefined;
  if (oppslag.motstrid) return { motstrid: oppslag.motstrid, confidence };
  const pest = oppslag.pest;
  if (!pest || pest.gruppe === "Ekskrementer") return undefined;
  const ukjentLatin = latinName.trim() !== "" && !/^ukjent$/i.test(latinName.trim()) && !oppslag.etterLatin;
  if (ukjentLatin) return undefined;
  return oppslag.generelt
    ? { pest, confidence: Math.min(confidence, MAKS_VED_GENERELT_ALIAS), generelltNavn: name.trim() }
    : { pest, confidence };
}

const artMedLatin = (p: Pest) => `${p.norsk} (${p.latin})`;

/**
 * H1: norsk og vitenskapelig navn peker på forskjellige arter. Ingen art
 * velges: svaret er «ikke identifisert sikkert», og begge artene vises som
 * alternativer med lav sikkerhet. Ekskrementer beholder typen (M4).
 */
function motstridResultat(
  [etterNavn, etterLatin]: [Pest, Pest],
  raw: Record<string, unknown>,
  f: { name: string; latinName: string; confidence: number; description: string; observasjon?: string; gruppe: PestGroup | null }
): AnalysisResult {
  const erEkskrementer = f.gruppe === "Ekskrementer";
  const annen = typeof raw.annenArt === "object" && raw.annenArt !== null ? (raw.annenArt as Record<string, unknown>) : undefined;
  const navn = (annen && typeof annen.name === "string" ? annen.name : f.name).trim().slice(0, 80);
  const latin = (annen && typeof annen.latinName === "string" ? annen.latinName : f.latinName).trim().slice(0, 80);
  // Ingen sikkerhet per art: modellens tall gjelder et svar som motsier seg selv.
  const kandidater = [etterNavn, etterLatin].map((p) => ({ name: p.norsk, latinName: p.latin }));
  // Andre alternativer modellen selv ga, med modellens egne tall – men aldri de to over.
  const andre = parseAlternatives(raw.alternativer, f.gruppe).filter((a) => !kandidater.some((k) => k.name === a.name));
  const grunnlag = erEkskrementer
    ? { ...UNKNOWN, gruppe: "Ekskrementer", tiltak: EKSKREMENT_UKJENT_TILTAK, description: EKSKREMENT_UKJENT_TEKST }
    : { ...UNKNOWN, description: f.description || UNKNOWN.description, ...(etterNavn.gruppe === etterLatin.gruppe ? { gruppe: etterNavn.gruppe } : {}) };
  return {
    ...grunnlag,
    observasjon: f.observasjon,
    motstrid: { navn, latin, navnArt: artMedLatin(etterNavn), latinArt: artMedLatin(etterLatin), kandidater },
    alternativer: andre,
  };
}


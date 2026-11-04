import {
  findPest,
  findPestInGroup,
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
  const iGruppe = gruppe
    ? findPestInGroup(name, gruppe) ?? findPestInGroup(latinName, gruppe)
    : undefined;
  if (iGruppe || gruppe === "Ekskrementer") return iGruppe;
  return findPest(name) ?? findPest(latinName);
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
    const pest = lookupPest(name, latinName, gruppe);
    if (!pest) continue;

    let confidence = Number(rec.confidence);
    if (!Number.isFinite(confidence)) confidence = 0;
    confidence = Math.min(100, Math.max(0, Math.round(confidence)));

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
  if (findPest(name) || findPest(latinName)) return undefined;

  let confidence = Number(rec.confidence);
  if (!Number.isFinite(confidence)) return undefined;
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));
  if (confidence < MIN_CONFIDENCE) return undefined;

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
  const pest = lookupPest(name, latinName, gruppe);
  const description =
    typeof raw.description === "string" && raw.description.trim().length > 0
      ? raw.description.trim()
      : "";
  const observasjon =
    typeof raw.observasjon === "string" && raw.observasjon.trim().length > 0
      ? raw.observasjon.trim()
      : undefined;

  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 55;
  confidence = Math.min(100, Math.max(0, Math.round(confidence)));

  if (!pest || raw.found === false || confidence < MIN_CONFIDENCE) {
    const annenArt = parseAnnenArt(raw.annenArt);
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
    bekreftelse: pest.bekreftelse,
    notat: pest.notat,
    fhiUrl: fhiUrl(pest.slug),
  };
}


import { ANIMAL_SIZES, DROPPING_SIZES, LOCATIONS } from "@/lib/types";

/**
 * Validering av alle felter i /api/analyze (S1).
 *
 * Prinsipp: valgfelter godtas bare med kjente verdier – alt annet behandles
 * som «ikke oppgitt», akkurat som et tomt felt. Fritekst renses for
 * kontrolltegn og kuttes til et fast tak. Feltnavn og gyldige verdier er de
 * samme som klienten sender i dag, så API-kontrakten er uendret.
 */

export const MAKS_FRITEKST = 300;

export type AnalyseType = "dyr" | "ekskrementer";

export interface AnalyseFelter {
  location: string;
  storrelse: string;
  analyseType: AnalyseType;
  droppingSize: string;
  beskrivelse: string;
  notesAnimal: string;
}

const LOCATION_VERDIER = new Set<string>(LOCATIONS.map((l) => l.value));
const STORRELSE_VERDIER = new Set<string>(ANIMAL_SIZES);
const DROPPING_VERDIER = new Set<string>(DROPPING_SIZES.map((s) => s.value));

/**
 * Kontrolltegn (unntatt linjeskift og tab), usynlige tegn med null bredde og
 * tegn som snur tekstretningen. Slike tegn brukes til å skjule instrukser
 * for AI-en i tekst som ser harmløs ut.
 */
const USYNLIGE_OG_KONTROLLTEGN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Fjerner slike tegn, trimmer og kutter. */
export function rensTekst(verdi: unknown, maks = MAKS_FRITEKST): string {
  if (typeof verdi !== "string") return "";
  return verdi.replace(USYNLIGE_OG_KONTROLLTEGN, "").trim().slice(0, maks);
}

function valg(verdi: unknown, gyldige: Set<string>): string {
  if (typeof verdi !== "string") return "";
  const v = verdi.trim();
  return gyldige.has(v) ? v : "";
}

export function lesAnalyseFelter(form: FormData): AnalyseFelter {
  return {
    location: valg(form.get("location"), LOCATION_VERDIER),
    storrelse: valg(form.get("storrelse"), STORRELSE_VERDIER),
    analyseType: form.get("type") === "ekskrementer" ? "ekskrementer" : "dyr",
    droppingSize: valg(form.get("droppingSize"), DROPPING_VERDIER),
    beskrivelse: rensTekst(form.get("beskrivelse")),
    notesAnimal: rensTekst(form.get("notesAnimal")),
  };
}

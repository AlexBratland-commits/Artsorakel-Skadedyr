export type Severity = "lav" | "middels" | "høy";

/** Svaret AI-en skal returnere – bevisst lite, resten beriker vi selv. */
export interface AiIdentification {
  found: boolean;
  name: string;
  latinName: string;
  description: string;
  severity: Severity;
  fhiSlug: string;
  /** AI-ens egen sikkerhet, 0–100. Ikke en måling – se ResultDisplay. */
  confidence?: number;
}

/** Én mulig art, med modellens begrunnelse. */
export interface Candidate {
  name: string;
  latinName: string;
  confidence: number;
  hvorfor: string;
}

/** Det klienten faktisk får – AI-svar + berikelse fra vår egen artsdatabase. */
export interface AnalysisResult extends AiIdentification {
  confidence: number;
  gruppe?: string;
  tiltak: string[];
  utbredelse?: string;
  sesong?: string;
  fhiUrl: string;
  /** Hva modellen faktisk mener å se på bildet. */
  observasjon?: string;
  /** Nest beste forslag, sortert fallende. Tom hvis modellen var sikker. */
  alternativer: Candidate[];
  /** Arter dette lett forveksles med, fra artsdatabasen. */
  forveksles?: string[];
  /** Ekstra kjennetegn som bekrefter funnet – vises for ekskrement-arter. */
  bekreftelse?: string[];
  /** Kort, viktig varsel som fremheves i resultatvisningen. */
  notat?: string;
  /** Satt når treffet er en usikker enkeltkandidat (confidence 30–49) – vises som "Mulig [navn]". */
  usikkerKandidat?: boolean;
  /** Satt hvis svaret kom fra serverens cache (samme bilde analysert før). */
  cached?: boolean;
}

export interface HistoryEntry {
  id: string;
  /** ISO-tidspunkt */
  tid: string;
  /** Liten JPEG-thumbnail som data-URL */
  thumb: string;
  sted: string;
  resultat: AnalysisResult;
}

export const LOCATIONS = [
  { value: "inne", label: "Inne i bygning", prompt: "inne i en bygning" },
  { value: "kjeller", label: "Kjeller eller fuktig rom", prompt: "i en kjeller eller et fuktig område" },
  { value: "loft", label: "Loft", prompt: "på et loft" },
  { value: "bad", label: "Bad eller vaskerom", prompt: "på et bad eller våtrom" },
  { value: "kjoekken", label: "Kjøkken eller matlager", prompt: "på et kjøkken eller nær mat" },
  { value: "soverom", label: "Soverom eller seng", prompt: "på et soverom eller i sengen" },
  { value: "hage", label: "Hage eller uteområde", prompt: "i en hage eller utendørs" },
  { value: "skog", label: "Skog eller natur", prompt: "i skog eller natur" },
  { value: "vann", label: "Ved vann", prompt: "ved vann, for eksempel ved en brygge, bekk eller innsjø" },
  { value: "treverk", label: "Treverk eller ved", prompt: "i treverk eller ved" },
  { value: "kloakk", label: "Kloakk eller avløp", prompt: "i kloakk eller avløp" },
  { value: "annet", label: "Et annet sted", prompt: "et annet sted" },
] as const;

export type LocationValue = (typeof LOCATIONS)[number]["value"];

// ── Ekskrement-spesifikke feltvalg ───────────────────────────────────────
// Disse sendes til API-et og brukes kun til å berike prompten når brukeren
// analyserer ekskrementer i stedet for et levende dyr.

export const DROPPING_SIZES = [
  { value: "1-3mm", label: "1–3 mm (som støvkorn eller sandkorn)", prompt: "1–3 mm" },
  { value: "3-6mm", label: "3–6 mm (som et riskorn)", prompt: "3–6 mm" },
  { value: "6-15mm", label: "6–15 mm (som en solsikkekjerne til en liten bønne)", prompt: "6–15 mm" },
  { value: "15mm+", label: "15 mm eller mer (som en liten pølsebit)", prompt: "15 mm eller mer" },
] as const;
// ── Sikkerhetsnivå ───────────────────────────────────────────────────────
// Modellens prosent er dens egen vurdering, ikke en måling, og er dårlig
// kalibrert. Vi viser derfor bare et grovt nivå. Under 30 blir svaret
// "Ukjent" allerede på serveren (MIN_CONFIDENCE i /api/analyze).

export type Sikkerhetsnivaa = "lav" | "middels" | "høy";

export const SIKKERHET_GRENSER = { MIDDELS: 50, HOY: 80 } as const;

export function sikkerhetsnivaa(confidence: number): Sikkerhetsnivaa {
  if (confidence >= SIKKERHET_GRENSER.HOY) return "høy";
  if (confidence >= SIKKERHET_GRENSER.MIDDELS) return "middels";
  return "lav";
}

export const SIKKERHET_ETIKETT: Record<Sikkerhetsnivaa, string> = {
  lav: "Lav sikkerhet",
  middels: "Middels sikkerhet",
  høy: "Høy sikkerhet",
};

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
  { value: "bad", label: "Bad eller vaskerom", prompt: "på et bad eller våtrom" },
  { value: "kjoekken", label: "Kjøkken eller matlager", prompt: "på et kjøkken eller nær mat" },
  { value: "soverom", label: "Soverom eller seng", prompt: "på et soverom eller i sengen" },
  { value: "hage", label: "Hage eller uteområde", prompt: "i en hage eller utendørs" },
  { value: "skog", label: "Skog eller natur", prompt: "i skog eller natur" },
  { value: "treverk", label: "Treverk eller ved", prompt: "i treverk eller ved" },
  { value: "kloakk", label: "Kloakk eller avløp", prompt: "i kloakk eller avløp" },
  { value: "annet", label: "Et annet sted", prompt: "et annet sted" },
] as const;

export type LocationValue = (typeof LOCATIONS)[number]["value"];
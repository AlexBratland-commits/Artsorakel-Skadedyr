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

export const DROPPING_SHAPES = [
  { value: "runde", label: "Runde", prompt: "runde" },
  { value: "polseformet", label: "Pølseformet med spisse ender", prompt: "pølseformet med spisse ender" },
  { value: "avlange", label: "Avlange, jevnt tykke", prompt: "avlange og jevnt tykke" },
  { value: "bananformet", label: "Bananformet, litt bøyd", prompt: "bananformet og litt bøyd" },
] as const;

export const DROPPING_CONTENTS = [
  { value: "rent", label: "Rent, ingen synlige rester", prompt: "rent, uten synlige rester" },
  { value: "pels", label: "Pels/hår", prompt: "pels eller hår" },
  { value: "fro", label: "Frø eller planterester", prompt: "frø eller planterester" },
  { value: "insekt", label: "Insektskall (glinsende)", prompt: "glinsende insektskall" },
  { value: "bein", label: "Bein/skjell", prompt: "bein eller skjell" },
] as const;

export const DROPPING_COUNTS = [
  { value: "spredt", label: "Spredt, enkeltvis", prompt: "spredt enkeltvis" },
  { value: "haug", label: "Samlet i haug", prompt: "samlet i én haug" },
  { value: "vegg", label: "Langs en vegg", prompt: "liggende langs en vegg" },
  { value: "klynge", label: "I klynge/flere hauger på samme sted", prompt: "i en klynge, med flere hauger på samme sted" },
] as const;

export const DROPPING_TEXTURES = [
  { value: "tørr", label: "Tørr og fast", prompt: "tørr og fast" },
  { value: "glinsende", label: "Glinsende/blank", prompt: "glinsende eller blank" },
  { value: "smuldrer", label: "Smuldrer lett ved berøring", prompt: "smuldrer lett ved berøring" },
] as const;
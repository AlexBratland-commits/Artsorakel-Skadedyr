/**
 * Innholdet i PDF-rapporten, hentet rett fra det eksisterende analyseresultatet.
 *
 * Ingen nye AI-kall og ingen nye faglige råd: alt kommer fra resultatet
 * (som igjen kommer fra det godkjente artsbiblioteket) eller fra de faste
 * tekstene i resultat-tekst.ts, de samme som vises på skjermen.
 * Sikkerhet vises bare som modellens nivå (lav/middels/høy), aldri som prosent.
 */
import { SIKKERHET_ETIKETT, sikkerhetsnivaa, type AnalysisResult } from "../types";
import { LOCATIONS } from "../types";
import {
  ALTERNATIV_MOTSTRID_TEKST,
  ALVORLIGHET,
  alternativNivaa,
  harSterkereAlternativ,
  annenArtTekst,
  EKSKREMENT_FORBEHOLD,
  ELDRE_ARTSDATA_TEKST,
  GENERELT_FORBEHOLD,
  latinskNavn,
  motstridKandidater,
  MOTSTRID_KANDIDATER_TITTEL,
  MOTSTRID_TITTEL,
  motstridTekst,
  generelltNavnTekst,
  OCAB_SKADEDYR_URL,
  oppryddingFor,
  SIKKERHET_FORKLARING,
  SIKKERHET_USIKKER_TILLEGG,
  USIKKER_KANDIDAT_TEKST,
  visningsnavn,
} from "../resultat-tekst";

/** Påkrevd forbehold i alle rapporter (godkjent tekst). */
export const AI_FORBEHOLD =
  "Rapporten er generert ved hjelp av kunstig intelligens basert på innsendt bilde og tilgjengelige opplysninger. Resultatet er veiledende og erstatter ikke en faglig vurdering på stedet.";

export const RAPPORT_TITTEL = "Artsorakel – analyserapport";

/** Tekst fra kontaktkortet i appen (allerede i bruk). */
const OCAB_HJELP = "Ocab kan hjelpe deg med å kartlegge problemet og vurdere riktige tiltak.";

export interface RapportAlternativ {
  navn: string;
  latin?: string;
  sikkerhet?: string;
  hvorfor?: string;
}

export interface RapportInnhold {
  tittel: string;
  analyseDato: string;
  rapportDato: string;
  /** Kort dato til bunnteksten. */
  rapportDatoKort: string;
  navn: string;
  latin?: string;
  /** «Ekskrementer» eller hovedgruppen, f.eks. «Maur». */
  type?: string;
  funnsted?: string;
  sikkerhet?: { etikett: string; forklaring: string };
  merknader: string[];
  beskrivelse: string;
  grunnlag?: string;
  alternativer: RapportAlternativ[];
  risiko: { etikett?: string; tekst?: string; notat?: string; forbehold?: string };
  omArten: { utbredelse?: string; sesong?: string };
  tiltak: string[];
  bekreftelse: string[];
  fagfolk: string[];
  forveksles: string[];
  forbehold: string[];
  /** H1: motstridende artsnavn – mulige arter uten sikkerhet. */
  motstrid?: { tittel: string; tekst: string; kandidaterTittel: string; kandidater: string[] };
  /** Trygg opprydding for ekskrementer av gnagere og flaggermus (M9). */
  opprydding?: string;
  aiForbehold: string;
  kilde?: string;
  /** Filnavn uten mappe, bare a–z, 0–9 og bindestrek. */
  filnavn: string;
}

export interface RapportValg {
  /** Når analysen ble gjort. */
  analyseTid: Date;
  /** Når rapporten lages (standard: nå). */
  rapportTid?: Date;
  /** Funnsted brukeren valgte (verdien fra LOCATIONS). */
  sted?: string;
  /** Funnet er åpnet fra historikken og ble lagret med eldre artsdata. */
  eldreArtsdata?: boolean;
}

const tidsformat = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Oslo",
});
const kortDato = new Intl.DateTimeFormat("nb-NO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Oslo",
});
const filDato = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }); // ÅÅÅÅ-MM-DD


/** Filnavnvennlig: æ → ae, ø → o, å → a, alt annet bindestrek. */
export function filnavnDel(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function lagRapportInnhold(result: AnalysisResult, valg: RapportValg): RapportInnhold {
  const rapportTid = valg.rapportTid ?? new Date();
  const nivaa = sikkerhetsnivaa(result.confidence);
  const usikker = nivaa !== "høy";
  const grad = result.found ? ALVORLIGHET[result.severity] ?? ALVORLIGHET.middels : undefined;
  const navn = visningsnavn(result);

  const merknader: string[] = [];
  const annen = annenArtTekst(result);
  if (annen) merknader.push(annen);
  const generelt = generelltNavnTekst(result);
  if (generelt) merknader.push(generelt);
  const motstridForklaring = motstridTekst(result);
  if (!result.found && result.annenArt?.hvorfor) merknader.push(result.annenArt.hvorfor);
  if (result.usikkerKandidat) merknader.push(USIKKER_KANDIDAT_TEKST);
  if (valg.eldreArtsdata) merknader.push(ELDRE_ARTSDATA_TEKST);
  if (harSterkereAlternativ(result)) merknader.push(ALTERNATIV_MOTSTRID_TEKST);

  // Som på skjermen: vis nivået for et alternativ bare når det er lavere enn hovedforslagets.
  const alternativer: RapportAlternativ[] = result.alternativer.map((alt) => ({
    navn: alt.name,
    latin: alt.latinName && alt.latinName !== "Ukjent" ? alt.latinName : undefined,
    sikkerhet: alternativNivaa(result, alt),
    hvorfor: alt.hvorfor || undefined,
  }));

  const fagfolk: string[] = [];
  if (grad) fagfolk.push(grad.tekst);
  if (result.found && usikker) fagfolk.push(SIKKERHET_USIKKER_TILLEGG);
  fagfolk.push(`${OCAB_HJELP} ${OCAB_SKADEDYR_URL}`);

  const forbehold: string[] = [];
  if (result.gruppe === "Ekskrementer") forbehold.push(EKSKREMENT_FORBEHOLD);
  forbehold.push(GENERELT_FORBEHOLD);

  const sted = valg.sted ? LOCATIONS.find((l) => l.value === valg.sted)?.label ?? valg.sted : undefined;

  return {
    tittel: RAPPORT_TITTEL,
    analyseDato: tidsformat.format(valg.analyseTid),
    rapportDato: tidsformat.format(rapportTid),
    rapportDatoKort: kortDato.format(rapportTid),
    navn,
    latin: latinskNavn(result),
    type: result.gruppe || undefined,
    funnsted: sted,
    sikkerhet: result.found
      ? {
          etikett: SIKKERHET_ETIKETT[nivaa],
          forklaring: usikker ? `${SIKKERHET_FORKLARING} ${SIKKERHET_USIKKER_TILLEGG}` : SIKKERHET_FORKLARING,
        }
      : undefined,
    merknader,
    beskrivelse: result.description,
    grunnlag: result.observasjon || undefined,
    alternativer,
    risiko: {
      etikett: grad?.etikett,
      tekst: grad?.tekst,
      notat: result.notat || undefined,
      forbehold: result.forbehold || undefined,
    },
    omArten: { utbredelse: result.utbredelse || undefined, sesong: result.sesong || undefined },
    tiltak: result.tiltak ?? [],
    bekreftelse: result.bekreftelse ?? [],
    fagfolk,
    forveksles: result.forveksles ?? [],
    forbehold,
    opprydding: oppryddingFor(result),
    motstrid: motstridForklaring
      ? { tittel: MOTSTRID_TITTEL, tekst: motstridForklaring, kandidaterTittel: MOTSTRID_KANDIDATER_TITTEL, kandidater: motstridKandidater(result) }
      : undefined,
    aiForbehold: AI_FORBEHOLD,
    kilde: result.fhiUrl || undefined,
    filnavn: `artsorakel-rapport-${filDato.format(valg.analyseTid)}${filnavnDel(navn) ? `-${filnavnDel(navn)}` : ""}.pdf`,
  };
}

// ── Samtalevedlegg ───────────────────────────────────────────────────────

export interface SamtaleVedlegg {
  meldinger: { fra: "kunde" | "ai"; tekst: string; tid?: string }[];
}

const klokke = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
const dagOgKlokke = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});
const dag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" });

/**
 * Gjør funnets meldinger om til vedlegg, i den rekkefølgen de ble skrevet.
 * Tidspunktet vises bare når meldingen har et; det brukes aldri til å avgjøre
 * hvilken analyse meldingen hører til (se samtale.ts).
 */
export function lagSamtaleVedlegg(
  meldinger: { rolle: "user" | "assistant"; tekst: string; tid?: string }[],
  analyseTid: Date
): SamtaleVedlegg {
  return {
    meldinger: meldinger
      .filter((m) => m.tekst.trim())
      .map((m) => {
        const t = m.tid ? new Date(m.tid) : undefined;
        const gyldig = t && !Number.isNaN(t.getTime());
        return {
          fra: m.rolle === "user" ? ("kunde" as const) : ("ai" as const),
          tekst: m.tekst,
          tid: gyldig ? (dag.format(t) === dag.format(analyseTid) ? `kl. ${klokke.format(t)}` : dagOgKlokke.format(t)) : undefined,
        };
      }),
  };
}

/**
 * Faste tekster for et analyseresultat. Brukes både av resultatvisningen og
 * av PDF-rapporten, så de alltid sier det samme. Endres bare med faglig
 * godkjenning – ingen av tekstene er laget spesielt for PDF-en.
 */
import { SIKKERHET_ETIKETT, sikkerhetsnivaa, type AnalysisResult, type Severity } from "./types";

export const ALVORLIGHET: Record<Severity, { etikett: string; tekst: string }> = {
  lav: { etikett: "Lite alvorlig", tekst: "Sjelden behov for profesjonell hjelp." },
  middels: { etikett: "Bør følges opp", tekst: "Gjør tiltak nå, så slipper du et større problem senere." },
  høy: { etikett: "Bør håndteres raskt", tekst: "Denne arten sprer seg eller gjør skade – ta kontakt med fagfolk." },
};

/** Overskrift når funnet ikke kunne bestemmes (godkjent tekst, F1). */
export const IKKE_IDENTIFISERT = "Kunne ikke identifisere funnet sikkert";

/** Overskrift når bildet tydelig ikke viser et skadedyr. */
export const IKKE_SKADEDYR_OVERSKRIFT = "Ingen skadedyr på bildet";

export const USIKKER_KANDIDAT_TEKST =
  "Dette er det mest sannsynlige forslaget, men sikkerheten er for lav til en trygg bestemmelse. Bruk kjennetegnene under til å sjekke selv, eller kontakt Ocab for bekreftelse.";

export const SIKKERHET_FORKLARING = "Dette er modellens egen vurdering av bildet, ikke en måling.";
export const SIKKERHET_USIKKER_TILLEGG =
  "Ved lav eller middels sikkerhet bør bestemmelsen bekreftes av en fagperson.";

export const EKSKREMENT_FORBEHOLD =
  "Dette er en AI-vurdering basert på bilde og oppgitte kjennetegn, ikke en laboratorieprøve. Er du usikker, eller gjelder det et sted der sikker bestemmelse er viktig – kontakt Ocab for bekreftelse.";

/**
 * Trygg opprydding av gnager- og flaggermusekskrementer (M9). Bygger på FHIs
 * råd: fukt med klut, ikke kost eller støvsuger, bruk hansker og munnbind.
 */
export const OPPRYDDING_EKSKREMENTER =
  "Ved opprydding: bruk hansker og munnbind, fukt ekskrementene med såpevann og tørk opp med klut. Ikke fei eller støvsug – det kan virvle opp smittestoffer.";

/** Ekskrementtyper som får oppryddingsrådet. Ukjente ekskrementer får det også. */
const OPPRYDDING_ARTER = new Set(["Mus", "Brunrotte", "Flaggermus"]);

/** Oppryddingsråd for ekskrementfunn, ellers undefined (bilder av dyr, mårdyr). */
export function oppryddingFor(result: AnalysisResult): string | undefined {
  if (result.gruppe !== "Ekskrementer") return undefined;
  return !result.found || OPPRYDDING_ARTER.has(result.name) ? OPPRYDDING_EKSKREMENTER : undefined;
}

export const GENERELT_FORBEHOLD =
  "Svaret er et forslag fra en bildeanalyse og kan være feil. Arter som ligner på hverandre – for eksempel skjeggkre og sølvkre – krever limfeller og en fagperson for sikker bestemmelse.";

export const ELDRE_ARTSDATA_TEKST = "Artsopplysninger kan ha blitt oppdatert siden denne analysen ble utført.";

export const OCAB_SKADEDYR_URL = "https://www.ocab.no/skade/skadedyr/";

/**
 * H3: sikkerheten som vises for resultatet – for en art i biblioteket
 * analysens tall, for en art utenfor listen AI-ens tall for den arten.
 * Ukjente og motstridende funn har ingen sikkerhet (aldri «0»).
 */
export function visningsSikkerhet(result: AnalysisResult): { confidence: number; etikett: string } | undefined {
  const annen = !result.found ? result.annenArt : undefined;
  const c = result.found ? result.confidence : annen?.confidence;
  if (typeof c !== "number" || !Number.isFinite(c)) return undefined;
  return { confidence: c, etikett: SIKKERHET_ETIKETT[sikkerhetsnivaa(c)] };
}

/** H3: tekst til «Meld fra om feil bestemmelse» – samme navn og sikkerhet som på skjermen. */
export function feilmeldingTekst(result: AnalysisResult): string {
  const sikkerhet = visningsSikkerhet(result);
  const annen = !result.found && result.annenArt;
  const latin = latinskNavn(result);
  const hva =
    result.found || annen
      ? `Appen foreslo ${visningsnavn(result)}${latin ? ` (${latin})` : ""}${annen ? " – ikke i databasen" : ""}${
          sikkerhet ? `, sikkerhet: ${sikkerhet.etikett.toLowerCase()} (tall i analysen: ${sikkerhet.confidence})` : ""
        }.`
      : "Appen kunne ikke identifisere funnet sikkert.";
  const motstrid = motstridKandidater(result);
  const motstridLinje = motstrid.length ? `\nMotstridende artsnavn – mulige arter: ${motstrid.join(", ")}.` : "";
  return `${hva}${motstridLinje}\n\nJeg tror det egentlig er: \n\nHva jeg så: \n`;
}

export function annenArtTekst(result: AnalysisResult): string | undefined {
  const annen = !result.found ? result.annenArt : undefined;
  if (!annen) return undefined;
  return `Ikke i Ocabs database – forslaget kommer fra AI-en alene (${SIKKERHET_ETIKETT[sikkerhetsnivaa(annen.confidence)].toLowerCase()}).`;
}

/** H1: overskrift når norsk og vitenskapelig navn peker på forskjellige arter. */
export const MOTSTRID_TITTEL = "Analysen inneholder motstridende artsnavn";
export const MOTSTRID_KANDIDATER_TITTEL = "Mulige arter (ingen sikkerhet oppgitt)";

const tekstFelt = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";

/**
 * H1: modellen oppga et norsk og et vitenskapelig navn som peker på
 * forskjellige arter. Samme tekst på skjermen, i historikken og i PDF-en.
 * Tåler ødelagte felt fra eldre lagret historikk.
 */
export function motstridTekst(result: AnalysisResult): string | undefined {
  const m = result.motstrid as Partial<Record<string, unknown>> | undefined;
  if (result.found || !m) return undefined;
  const { navn, latin, navnArt, latinArt } = m;
  if (![navn, latin, navnArt, latinArt].every(tekstFelt)) return undefined;
  return `AI-en oppga navn som peker på forskjellige arter: «${navn}» er ${navnArt}, mens «${latin}» er ${latinArt}. Artsorakel velger ikke mellom dem og oppgir ingen sikkerhet for hver av dem. Bestemmelsen er usikker og bør bekreftes av en fagperson.`;
}

/** De mulige artene ved motstridende navn, som «Klatremus (Myodes glareolus)» – uten sikkerhet. */
export function motstridKandidater(result: AnalysisResult): string[] {
  if (!motstridTekst(result)) return [];
  const m = result.motstrid!;
  const liste = Array.isArray(m.kandidater) ? m.kandidater : [];
  const fra = liste
    .filter((k) => typeof k === "object" && k !== null && tekstFelt(k.name))
    .map((k) => (tekstFelt(k.latinName) ? `${k.name} (${k.latinName})` : k.name));
  return fra.length ? fra : [m.navnArt, m.latinArt];
}

/** H1: forklaring når bare et generelt navn («mus», «veps» …) pekte på arten. */
export function generelltNavnTekst(result: AnalysisResult): string | undefined {
  if (!result.found || !tekstFelt(result.generelltNavn)) return undefined;
  return `AI-en brukte bare det generelle navnet «${result.generelltNavn}», som kan gjelde flere arter. ${result.name} vises derfor bare som et mulig forslag.`;
}

/** Navnet som vises som overskrift for resultatet. */
export function visningsnavn(result: AnalysisResult): string {
  const annen = !result.found ? result.annenArt : undefined;
  if (annen) return `Mulig ${annen.name}`;
  if (result.found && result.usikkerKandidat) return `Mulig ${result.name}`;
  if (result.ikkeSkadedyr) return IKKE_SKADEDYR_OVERSKRIFT;
  if (!result.found) return IKKE_IDENTIFISERT;
  return result.name;
}

export function latinskNavn(result: AnalysisResult): string | undefined {
  const annen = !result.found ? result.annenArt : undefined;
  const navn = annen ? annen.latinName : result.found ? result.latinName : undefined;
  return navn && navn !== "Ukjent" ? navn : undefined;
}

// ── Alternativer (M3, revisjon) ─────────────────────────────────────────

/** Vises når modellen gir et alternativ minst like høy sikkerhet som hovedforslaget. */
export const ALTERNATIV_MOTSTRID_TEKST =
  "Et alternativ ble vurdert som minst like sannsynlig som hovedforslaget. Bestemmelsen bør bekreftes av en fagperson.";

const trinn = (confidence: number) => ({ lav: 1, middels: 2, høy: 3 })[sikkerhetsnivaa(confidence)];

/** Har modellen gitt et alternativ minst like høy sikkerhet som hovedforslaget? */
export function harSterkereAlternativ(result: AnalysisResult): boolean {
  return result.found && result.alternativer.some((a) => a.confidence >= result.confidence);
}

/** M3: alternativene som er vurdert som minst like sannsynlige som hovedforslaget. */
export function sterkereAlternativer(result: AnalysisResult): AnalysisResult["alternativer"] {
  if (!result.found || !Array.isArray(result.alternativer)) return [];
  return result.alternativer.filter((a) => typeof a?.confidence === "number" && a.confidence >= result.confidence);
}

/** M3: kort merknad i historikklisten når et alternativ er minst like sannsynlig. */
export function historikkMerknad(result: AnalysisResult): string | undefined {
  return sterkereAlternativer(result).length ? "Alternativ like sannsynlig" : undefined;
}

/**
 * Sikkerhetsnivået som skal vises for et alternativ. Som før vises det når
 * det er lavere enn hovedforslagets (F7), men nå også når alternativet er
 * minst like sannsynlig – da skjules aldri motstriden.
 */
export function alternativNivaa(result: AnalysisResult, alt: { confidence: number }): string | undefined {
  if (!result.found || trinn(alt.confidence) < trinn(result.confidence) || alt.confidence >= result.confidence) {
    return SIKKERHET_ETIKETT[sikkerhetsnivaa(alt.confidence)];
  }
  return undefined;
}

import { PESTS } from "@/lib/pests";

/**
 * Enkel, deterministisk sjekk av om et chatspørsmål helt klart ligger
 * utenfor skadedyrfaget (for eksempel «Hvem er kong Harald?»). Slike
 * spørsmål besvares med en fast tekst – uten AI-kall.
 *
 * Bevisst forsiktig: et spørsmål blokkeres bare når det BÅDE ligner et
 * typisk «allmennspørsmål» OG ikke inneholder noe fagrelevant ord. Alt annet
 * – også korte oppfølgere som «Er den farlig?» – går til AI-en, som har egne
 * regler for å holde seg til faget.
 */

export const UTENFOR_FAGET_SVAR =
  "Jeg er Artsorakels fagassistent og kan bare hjelpe med skadedyr: hva funnet er, hvor alvorlig det er, spor som ekskrementer og gnagemerker, forebygging, tetting og når du bør kontakte Ocab. Spør gjerne om noe av dette.";

/** Typiske allmennspørsmål som ikke har noe med skadedyr å gjøre. */
const ALLMENNE_MONSTRE: RegExp[] = [
  /^\s*(hvem|hva) (er|var|het|heter) (kong|dronning|prins|prinsesse|president|statsminister|ordfører)\b/i,
  /^\s*hvem (er|var)\s+[A-ZÆØÅ][a-zæøå]+(\s+[A-ZÆØÅ][a-zæøå]+)*\s*\??\s*$/,
  /\b(skriv|lag)\s+(en|et|ei|meg en|meg et)?\s*(stil|dikt|sang|novelle|eventyr|historie|søknad|cv|e-?post|kode|program|tale)\b/i,
  /\boversett\b/i,
  /\b(hovedstad(en)?|statsminister(en)?|president(en)?|kongen|dronningen|stortingsvalg|valget|fotball|eliteserien|aksje(r|kurs)?|bitcoin|kryptovaluta|oppskrift|middag|vær(et|meldingen)?)\b/i,
  /\b(regn ut|hva er)\s*\d+\s*[-+*x×/]\s*\d+/i,
];

/** Ord som gjør spørsmålet fagrelevant – da blokkeres det aldri. */
const FAGORD = [
  "skadedyr", "dyr", "insekt", "kryp", "småkryp", "larve", "egg", "spor", "ekskrement", "avføring", "bæsj", "skitt",
  "gnag", "bitt", "stikk", "kløe", "smitte", "allergi", "lukt", "lyd", "reir", "bol", "tue", "felle", "åte", "gift",
  "kjemikal", "sprøyt", "bekjemp", "skadedyrbekjemper", "ocab", "tett", "sprekk", "åpning", "inngang", "ventil",
  "loft", "kjeller", "vegg", "grunnmur", "kjøkken", "bad", "seng", "madrass", "hytte", "hus", "bolig", "leilighet",
  "fukt", "mat", "tørrvare", "forsikring", "huseier", "utleier", "leier", "kommune", "fredet", "lege", "farlig",
  "mus", "rotte", "maur", "veps", "bie", "humle", "møll", "kre", "flue", "mygg", "loppe", "lus", "midd", "flått",
  "edderkopp", "bille", "kakerlakk", "veggedyr", "flaggermus", "mår", "mink", "røyskatt", "fugl", "due", "måke",
];

const ARTSNAVN = Array.from(
  new Set(PESTS.flatMap((p) => [p.norsk, ...(p.aliaser ?? [])]).map((n) => n.toLowerCase()))
);

export function erHeltUtenforFaget(sporsmal: string): boolean {
  const tekst = sporsmal.trim();
  if (!tekst) return false;
  const liten = tekst.toLowerCase();
  if (FAGORD.some((o) => liten.includes(o)) || ARTSNAVN.some((n) => liten.includes(n))) return false;
  return ALLMENNE_MONSTRE.some((m) => m.test(tekst));
}

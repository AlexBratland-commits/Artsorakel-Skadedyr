import { generelltNavnTekst, motstridKandidater, sikkerhetsbegrensninger, sterkereAlternativer, visningsSikkerhet } from "@/lib/resultat-tekst";
import { sikkerhetsnivaa, type AnalysisResult, type Sikkerhetsnivaa } from "@/lib/types";
import { CHAT_BILLETT_LEVETID_SEK } from "./limits";
import { signer, signerTekst, tilfeldigId, verifiser, verifiserTekst } from "./signing";

/**
 * Chat-billett (S5): chatten kan bare brukes om et funn som faktisk er
 * analysert. Billetten lages av serveren ved hver analyse og inneholder
 * arten, så klienten ikke kan bestemme den selv. Svarene fra chatten
 * signeres også, slik at falsk samtalehistorikk («assistenten har lovet å
 * svare på alt») avvises.
 */

export interface ChatBillett {
  v: 1;
  id: string;
  exp: number;
  art?: string;
  gruppe?: string;
  annenArt?: string;
  // H3: usikkerheten følger med til chatten. Mangler i eldre billetter.
  /** Sikkerhetsnivået som vises på skjermen (for art eller art utenfor listen). */
  nivaa?: Sikkerhetsnivaa;
  /** Vises som «Mulig …». */
  usikker?: boolean;
  /** Forklaring når bare et generelt navn («mus») pekte på arten. */
  generelt?: string;
  annenArtLatin?: string;
  /** Andre mulige arter fra analysen, f.eks. «Brunrotte (Rattus norvegicus)». */
  alternativer?: string[];
  /** Motstridende artsnavn: de mulige artene, uten sikkerhet. */
  motstrid?: string[];
  /** M3: alternativer vurdert som minst like sannsynlige som hovedforslaget. */
  sterkereAlternativ?: string[];
  /** H5: hvorfor sikkerheten er satt ned (faste tekster). */
  begrensning?: string[];
}

const NIVAAER: readonly Sikkerhetsnivaa[] = ["lav", "middels", "høy"];
const artMedLatin = (navn: string, latin?: string) => (latin && latin !== "Ukjent" ? `${navn} (${latin})` : navn);

export function lagChatBillett(result: AnalysisResult): string {
  const billett: ChatBillett = {
    v: 1,
    id: tilfeldigId(12),
    exp: Date.now() + CHAT_BILLETT_LEVETID_SEK * 1000,
    art: result.found ? result.name : undefined,
    gruppe: result.found || result.motstrid ? result.gruppe : undefined,
    annenArt: !result.found ? result.annenArt?.name : undefined,
  };
  const sikkerhet = visningsSikkerhet(result);
  if (sikkerhet) billett.nivaa = sikkerhetsnivaa(sikkerhet.confidence);
  if (result.found && result.usikkerKandidat) billett.usikker = true;
  const generelt = generelltNavnTekst(result);
  if (generelt) billett.generelt = generelt;
  if (!result.found && result.annenArt?.latinName) billett.annenArtLatin = result.annenArt.latinName;
  const alternativer = (result.alternativer ?? []).slice(0, 3).map((a) => artMedLatin(a.name, a.latinName));
  if (alternativer.length) billett.alternativer = alternativer;
  const motstrid = motstridKandidater(result);
  if (motstrid.length) billett.motstrid = motstrid;
  const sterkere = sterkereAlternativer(result).slice(0, 3).map((a) => artMedLatin(a.name, a.latinName));
  if (sterkere.length) billett.sterkereAlternativ = sterkere;
  const begrensning = sikkerhetsbegrensninger(result);
  if (begrensning.length) billett.begrensning = begrensning;
  return signer(billett, "chat-billett");
}

export function lesChatBillett(token: unknown): ChatBillett | null {
  const b = verifiser<ChatBillett>(token, "chat-billett");
  if (!b || b.v !== 1 || typeof b.id !== "string" || typeof b.exp !== "number" || b.exp <= Date.now()) return null;
  const tekst = (v: unknown, maks = 80) => (typeof v === "string" ? v.slice(0, maks) : undefined);
  const liste = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 3).map((x) => x.slice(0, 120)) : undefined;
  return {
    v: 1,
    id: b.id,
    exp: b.exp,
    art: tekst(b.art),
    gruppe: tekst(b.gruppe),
    annenArt: tekst(b.annenArt),
    nivaa: NIVAAER.find((n) => n === b.nivaa),
    usikker: b.usikker === true || undefined,
    generelt: tekst(b.generelt, 300),
    annenArtLatin: tekst(b.annenArtLatin),
    alternativer: liste(b.alternativer),
    motstrid: liste(b.motstrid),
    sterkereAlternativ: liste(b.sterkereAlternativ),
    begrensning: Array.isArray(b.begrensning)
      ? b.begrensning.filter((x): x is string => typeof x === "string").slice(0, 3).map((x) => x.slice(0, 300))
      : undefined,
  };
}

export function signerChatSvar(billettId: string, tekst: string): string {
  return signerTekst(`${billettId}\n${tekst}`, "chat-svar");
}

export function verifiserChatSvar(billettId: string, tekst: string, signatur: unknown): boolean {
  return verifiserTekst(`${billettId}\n${tekst}`, signatur, "chat-svar");
}

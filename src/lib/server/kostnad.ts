import { erEvalModus } from "./config";
import { osloDato } from "./limits";
import { tellerLager } from "./store";
import type { Forbruk } from "./openrouter";

/**
 * KOSTNADSRAMME – reell kostnadskontroll i kroner og øre (her: amerikanske
 * dollar, som OpenRouter fakturerer i).
 *
 * Dette er noe annet enn antallsgrensene i limits.ts:
 *   • Antallsgrenser teller forespørsler (per enhet, per IP, per døgn). De
 *     hindrer misbruk og sikrer rettferdig fordeling, men sier ingenting om
 *     hva en analyse koster – det varierer med bildet, svarlengden og
 *     modellens pris.
 *   • Kostnadsrammen teller penger. Før hvert AI-kall reserveres et anslått
 *     maksbeløp; etter kallet erstattes det med den faktiske kostnaden.
 *     Når dagens ramme er brukt opp, avvises nye AI-kall.
 *   • OpenRouter-kredittaket er den siste barrieren, utenfor appen. Det
 *     virker selv om appen skulle ha en feil.
 *
 * Reservasjonen og kontrollen skjer i én udelt operasjon (Lua i Redis), så
 * samtidige kall fra flere ansatte kan ikke til sammen gå over rammen –
 * bortsett fra hvis ett kall koster mer enn reservasjonen. Derfor bør
 * reservasjonen settes over det et vanlig kall koster.
 */

const MIKRO = 1_000_000; // tellerne lagres som heltall i mikrodollar
const DOGN_TTL = 26 * 3600;

function desimal(navn: string, standard: number | undefined): number | undefined {
  const raw = process.env[navn];
  if (raw === undefined || raw.trim() === "") return standard;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) {
    console.warn(`⚠️  Ugyldig verdi for ${navn} – bruker ${standard ?? "ingen"}`);
    return standard;
  }
  return n;
}

export function kostnadsoppsett() {
  return {
    /** Maks samlet AI-kostnad per døgn (norsk tid), i USD. */
    maksPerDognUsd: desimal("ARTSORAKEL_MAKS_KOSTNAD_PER_DOGN_USD", 10)!,
    /** Beløp som holdes av før hvert AI-kall. Bør ligge over et vanlig kall. */
    reservasjonPerKallUsd: desimal("ARTSORAKEL_RESERVASJON_PER_AI_KALL_USD", 0.02)!,
    /** Valgfrie priser per million tokens, brukt hvis OpenRouter ikke oppgir kostnaden. */
    prisInnPerMTok: desimal("ARTSORAKEL_PRIS_INN_USD_PER_MTOK", undefined),
    prisUtPerMTok: desimal("ARTSORAKEL_PRIS_UT_USD_PER_MTOK", undefined),
  };
}

export interface Reservasjon {
  nokkel: string;
  mikro: number;
}

export type Kostnadskilde = "openrouter" | "beregnet" | "reservert" | "frigitt";

/**
 * Holder av det anslåtte beløpet før et AI-kall. Returnerer null hvis
 * dagens ramme ikke har plass. Kaster LagerUtilgjengelig hvis Upstash ikke
 * svarer.
 */
export async function reserverKostnad(): Promise<Reservasjon | null | "av"> {
  if (erEvalModus()) return "av";
  const { maksPerDognUsd, reservasjonPerKallUsd } = kostnadsoppsett();
  const nokkel = `artsorakel:kostnad:dogn:${osloDato()}`;
  const mikro = Math.round(reservasjonPerKallUsd * MIKRO);
  const r = await tellerLager().reserver(nokkel, mikro, Math.round(maksPerDognUsd * MIKRO), DOGN_TTL);
  return r.ok ? { nokkel, mikro } : null;
}

/**
 * Faktisk kostnad for et kall, i mikrodollar, og hvor tallet kommer fra.
 * `undefined` betyr ukjent – da beholdes reservasjonen som kostnad.
 */
export function faktiskKostnad(forbruk: Forbruk): { mikro: number; kilde: Kostnadskilde } | undefined {
  if (forbruk.kostnadUsd !== undefined) {
    return { mikro: Math.round(forbruk.kostnadUsd * MIKRO), kilde: "openrouter" };
  }
  const { prisInnPerMTok, prisUtPerMTok } = kostnadsoppsett();
  if (
    prisInnPerMTok !== undefined &&
    prisUtPerMTok !== undefined &&
    forbruk.tokensInn !== undefined &&
    forbruk.tokensUt !== undefined
  ) {
    const usd = (forbruk.tokensInn * prisInnPerMTok + forbruk.tokensUt * prisUtPerMTok) / 1_000_000;
    return { mikro: Math.round(usd * MIKRO), kilde: "beregnet" };
  }
  return undefined;
}

/**
 * Avregner etter kallet:
 * - kjent kostnad  → reservasjonen erstattes med faktisk beløp
 * - feilsvar fra OpenRouter (ikke fakturert) → reservasjonen frigis
 * - ukjent (tidsavbrudd, mangler kostnad) → reservasjonen beholdes
 * Feil ved avregningen stopper ikke svaret til brukeren.
 */
export async function avregnKostnad(
  reservasjon: Reservasjon,
  utfall: { type: "ok"; forbruk: Forbruk } | { type: "ikke_fakturert" } | { type: "ukjent" }
): Promise<{ kilde: Kostnadskilde; mikro: number }> {
  let ny = reservasjon.mikro;
  let kilde: Kostnadskilde = "reservert";
  if (utfall.type === "ikke_fakturert") {
    ny = 0;
    kilde = "frigitt";
  } else if (utfall.type === "ok") {
    const faktisk = faktiskKostnad(utfall.forbruk);
    if (faktisk) ({ mikro: ny, kilde } = faktisk);
  }
  const delta = ny - reservasjon.mikro;
  if (delta !== 0) {
    try {
      await tellerLager().okn(reservasjon.nokkel, DOGN_TTL, delta);
    } catch (err) {
      console.error("⚠️  Kunne ikke avregne kostnad:", err instanceof Error ? err.message : "ukjent feil");
    }
  }
  return { kilde, mikro: ny };
}

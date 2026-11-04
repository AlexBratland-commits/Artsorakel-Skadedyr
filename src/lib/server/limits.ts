import { heltall } from "./config";
import { signerTekst } from "./signing";
import { tellerLager } from "./store";

/**
 * Bruksgrenser og døgnbudsjett.
 *
 * Vernet er lagdelt – ingen enkelt grense er nok alene:
 * 1. Tilgangskode (når ARTSORAKEL_TILGANGSKODE er satt) – se access.ts
 * 2. Grense per enhet (innlogget nettleser)
 * 3. Grense per IP-adresse (IPv6 per /64)
 * 4. Felles døgnbudsjett for hele appen – telles først rett før AI-kallet
 * 5. Kredittak på OpenRouter-nøkkelen (settes i OpenRouter, utenfor appen)
 */

export interface Regel {
  navn: string;
  nokkel: string;
  maks: number;
  vinduSek: number;
}

export type GrenseResultat =
  | { ok: true; gjenstaende: number }
  | { ok: false; regel: string; maks: number; retryAfterSeconds: number };

const TIME = 3600;
const DOGN_TTL = 26 * 3600; // litt over ett døgn, så nøkkelen rydder seg selv

export async function sjekkGrenser(regler: Regel[]): Promise<GrenseResultat> {
  const lager = tellerLager();
  let gjenstaende = Number.POSITIVE_INFINITY;
  for (const [i, r] of regler.entries()) {
    const t = await lager.okn(`artsorakel:${r.nokkel}`, r.vinduSek);
    if (t.antall > r.maks) {
      const retry = r.vinduSek === DOGN_TTL ? sekunderTilMidnatt() : t.utloperOmSek;
      return { ok: false, regel: r.navn, maks: r.maks, retryAfterSeconds: Math.max(1, retry) };
    }
    if (i === 0) gjenstaende = r.maks - t.antall;
  }
  return { ok: true, gjenstaende: Number.isFinite(gjenstaende) ? gjenstaende : 0 };
}

// ── Norsk døgn ───────────────────────────────────────────────────────────

function osloDeler(dato = new Date()) {
  const deler = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(dato);
  const hent = (t: string) => deler.find((d) => d.type === t)?.value ?? "00";
  return { dato: `${hent("year")}-${hent("month")}-${hent("day")}`, h: +hent("hour"), m: +hent("minute"), s: +hent("second") };
}

/** Dagens dato i norsk tid (ÅÅÅÅ-MM-DD), brukt i nøkkelen for døgnbudsjettet. */
export function osloDato(dato = new Date()): string {
  return osloDeler(dato).dato;
}

export function sekunderTilMidnatt(dato = new Date()): number {
  const { h, m, s } = osloDeler(dato);
  return 24 * 3600 - (h * 3600 + m * 60 + s);
}

// ── Regler per funksjon ──────────────────────────────────────────────────

/**
 * IP-adressen lagres aldri i klartekst i Upstash. Nøkkelen er en HMAC av
 * adressen (IPv6 per /64): samme adresse gir samme nøkkel, så grensen virker,
 * men adressen kan ikke leses ut igjen. Tellerne slettes etter maks én time.
 */
export function anonymIp(ipNokkel: string): string {
  return signerTekst(ipNokkel, "ip-teller").slice(0, 22);
}

export interface Klient {
  ipNokkel: string;
  /** Enhets-ID fra tilgangscookien, når tilgangskode er i bruk. */
  sid?: string;
}

export function grenseverdier() {
  return {
    analyserPerTime: heltall("ARTSORAKEL_ANALYSER_PER_TIME", 0, 0, 10_000),
    analyserPerDogn: heltall("ARTSORAKEL_MAKS_ANALYSER_PER_DOGN", 200, 1, 1_000_000),
    chatPerTime: heltall("ARTSORAKEL_CHAT_PER_TIME", 0, 0, 10_000),
    chatPerMinutt: heltall("ARTSORAKEL_CHAT_PER_MINUTT", 10, 1, 10_000),
    chatPerDogn: heltall("ARTSORAKEL_MAKS_CHAT_PER_DOGN", 500, 1, 1_000_000),
  };
}

/**
 * Grenser før en analyse. Uten tilgangskode: 10 per time per IP, som før.
 * Med tilgangskode: 20 per time per enhet, og 3 × det per IP-adresse,
 * siden mange ansatte kan dele samme IP på kontoret.
 */
export function analyseRegler(k: Klient): Regel[] {
  const satt = grenseverdier().analyserPerTime;
  if (k.sid) {
    const perEnhet = satt || 20;
    return [
      { navn: "enhet_time", nokkel: `analyse:enhet:${k.sid}`, maks: perEnhet, vinduSek: TIME },
      { navn: "ip_time", nokkel: `analyse:ip:${anonymIp(k.ipNokkel)}`, maks: perEnhet * 3, vinduSek: TIME },
    ];
  }
  return [{ navn: "ip_time", nokkel: `analyse:ip:${anonymIp(k.ipNokkel)}`, maks: satt || 10, vinduSek: TIME }];
}

export function analyseDognRegel(): Regel {
  return { navn: "dogn", nokkel: `analyse:dogn:${osloDato()}`, maks: grenseverdier().analyserPerDogn, vinduSek: DOGN_TTL };
}

/**
 * Grenser for chatten. Romslige nok til at manuell testing og vanlig bruk
 * aldri stoppes (120 spørsmål per time), men med en kort spamgrense per
 * minutt (standard 10) mot automatiserte forespørsler. Kostnaden styres
 * uansett av døgnbudsjettet, kostnadsrammen og OpenRouter-saldoen.
 */
export function chatRegler(k: Klient): Regel[] {
  const { chatPerTime: satt, chatPerMinutt } = grenseverdier();
  const ip = anonymIp(k.ipNokkel);
  const perMinutt: Regel = { navn: "ip_minutt", nokkel: `chat:ip-min:${ip}`, maks: chatPerMinutt, vinduSek: 60 };
  if (k.sid) {
    const perEnhet = satt || 120;
    return [
      { navn: "enhet_time", nokkel: `chat:enhet:${k.sid}`, maks: perEnhet, vinduSek: TIME },
      { navn: "ip_time", nokkel: `chat:ip:${ip}`, maks: perEnhet * 3, vinduSek: TIME },
      perMinutt,
    ];
  }
  return [{ navn: "ip_time", nokkel: `chat:ip:${ip}`, maks: satt || 120, vinduSek: TIME }, perMinutt];
}

export function chatDognRegel(): Regel {
  return { navn: "dogn", nokkel: `chat:dogn:${osloDato()}`, maks: grenseverdier().chatPerDogn, vinduSek: DOGN_TTL };
}

/** Tak på antall spørsmål per analyse (per chat-billett). */
export const CHAT_PER_BILLETT = 60;
export const CHAT_BILLETT_LEVETID_SEK = 30 * 24 * 3600;

export function chatBillettRegel(billettId: string): Regel {
  return { navn: "billett", nokkel: `chat:billett:${billettId}`, maks: CHAT_PER_BILLETT, vinduSek: CHAT_BILLETT_LEVETID_SEK };
}

/** Grense for forsøk på tilgangskode: 10 per kvarter per IP. */
export function tilgangsforsokRegel(ipNokkel: string): Regel {
  return { navn: "tilgang", nokkel: `tilgang:ip:${anonymIp(ipNokkel)}`, maks: 10, vinduSek: 15 * 60 };
}

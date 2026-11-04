import crypto from "crypto";
import { openRouterApiKey } from "./config";

/**
 * Signering av små verdier (tilgangscookie, chat-billett, chatsvar) med
 * HMAC-SHA256. Klienten kan lese innholdet, men ikke endre det uten at
 * signaturen blir ugyldig.
 *
 * Nøkkelen kommer fra ARTSORAKEL_HEMMELIGHET. Er den ikke satt, avledes en
 * egen nøkkel fra OpenRouter-nøkkelen (den forlater aldri serveren). Da blir
 * alle innlogginger og chat-billetter ugyldige hvis OpenRouter-nøkkelen
 * byttes – derfor anbefales en egen ARTSORAKEL_HEMMELIGHET.
 */

let reserveHemmelighet: string | undefined;

function grunnhemmelighet(): string {
  const egen = process.env.ARTSORAKEL_HEMMELIGHET?.trim();
  if (egen) return egen;
  const api = openRouterApiKey();
  if (api) return `avledet-fra-openrouter:${api}`;
  // Ingen hemmelighet tilgjengelig (lokal kjøring uten oppsett): tilfeldig per prosess.
  reserveHemmelighet ??= crypto.randomBytes(32).toString("hex");
  return reserveHemmelighet;
}

function nokkel(formaal: string): Buffer {
  return crypto.createHmac("sha256", grunnhemmelighet()).update(`artsorakel:v1:${formaal}`).digest();
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

export function signerTekst(tekst: string, formaal: string): string {
  return b64url(crypto.createHmac("sha256", nokkel(formaal)).update(tekst).digest());
}

export function verifiserTekst(tekst: string, signatur: unknown, formaal: string): boolean {
  if (typeof signatur !== "string" || signatur.length > 100) return false;
  const forventet = Buffer.from(signerTekst(tekst, formaal));
  const faktisk = Buffer.from(signatur);
  return forventet.length === faktisk.length && crypto.timingSafeEqual(forventet, faktisk);
}

/** Lager "innhold.signatur", der innhold er JSON i base64url. */
export function signer(innhold: object, formaal: string): string {
  const data = b64url(JSON.stringify(innhold));
  return `${data}.${signerTekst(data, formaal)}`;
}

/** Returnerer innholdet hvis signaturen er gyldig, ellers null. */
export function verifiser<T extends object>(token: unknown, formaal: string): T | null {
  if (typeof token !== "string" || token.length > 4000) return null;
  const punkt = token.lastIndexOf(".");
  if (punkt <= 0) return null;
  const data = token.slice(0, punkt);
  if (!verifiserTekst(data, token.slice(punkt + 1), formaal)) return null;
  try {
    const innhold = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return innhold && typeof innhold === "object" ? (innhold as T) : null;
  } catch {
    return null;
  }
}

export function tilfeldigId(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

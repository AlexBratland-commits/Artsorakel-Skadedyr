import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { erEvalModus } from "./config";
import { signer, tilfeldigId, verifiser } from "./signing";

/**
 * Tilgangskode for ansatte.
 *
 * Settes ARTSORAKEL_TILGANGSKODE, må alle skrive inn koden én gang per enhet
 * før de kan analysere eller bruke chatten. Uten variabelen er appen åpen,
 * akkurat som før – slik kan den også åpnes for kunder senere.
 *
 * Flere koder kan oppgis kommaseparert. Da kan en ny kode innføres før den
 * gamle fjernes. Fjernes en kode, blir alle innlogginger med den ugyldige.
 */

export const TILGANG_COOKIE = "artsorakel_tilgang";
const LEVETID_SEK = 90 * 24 * 3600;
const MAKS_KODELENGDE = 200;

interface TilgangsInnhold {
  v: 1;
  sid: string;
  exp: number;
  k: string;
}

export interface Tilgang {
  kreves: boolean;
  ok: boolean;
  /** Enhets-ID, brukt til bruksgrenser per enhet. */
  sid?: string;
}

export function tilgangskoder(): string[] {
  return (process.env.ARTSORAKEL_TILGANGSKODE ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

export function tilgangKreves(): boolean {
  return tilgangskoder().length > 0 && !erEvalModus();
}

function kodeAvtrykk(kode: string): string {
  return crypto.createHash("sha256").update(`artsorakel-kode:${kode}`).digest("hex").slice(0, 32);
}

/** Sammenligner mot alle gyldige koder i konstant tid. Returnerer koden som passet. */
export function sjekkKode(kode: unknown): string | null {
  if (typeof kode !== "string" || !kode.trim() || kode.length > MAKS_KODELENGDE) return null;
  const forsok = crypto.createHash("sha256").update(kode.trim()).digest();
  let treff: string | null = null;
  for (const gyldig of tilgangskoder()) {
    const fasit = crypto.createHash("sha256").update(gyldig).digest();
    if (crypto.timingSafeEqual(forsok, fasit)) treff = gyldig;
  }
  return treff;
}

export function lesTilgang(request: NextRequest): Tilgang {
  if (!tilgangKreves()) return { kreves: false, ok: true };
  const innhold = verifiser<TilgangsInnhold>(request.cookies.get(TILGANG_COOKIE)?.value, "tilgang");
  const gyldigeAvtrykk = new Set(tilgangskoder().map(kodeAvtrykk));
  if (
    innhold &&
    innhold.v === 1 &&
    typeof innhold.sid === "string" &&
    typeof innhold.exp === "number" &&
    innhold.exp > Date.now() &&
    gyldigeAvtrykk.has(innhold.k)
  ) {
    return { kreves: true, ok: true, sid: innhold.sid };
  }
  return { kreves: true, ok: false };
}

export function settTilgangsCookie(res: NextResponse, kode: string): void {
  const innhold: TilgangsInnhold = {
    v: 1,
    sid: tilfeldigId(12),
    exp: Date.now() + LEVETID_SEK * 1000,
    k: kodeAvtrykk(kode),
  };
  res.cookies.set(TILGANG_COOKIE, signer(innhold, "tilgang"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LEVETID_SEK,
  });
}

export function slettTilgangsCookie(res: NextResponse): void {
  res.cookies.set(TILGANG_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export function tilgangNektet(): NextResponse {
  return NextResponse.json(
    { error: "Skriv inn tilgangskoden for å bruke Artsorakel.", kode: "tilgang_kreves" },
    { status: 401 }
  );
}

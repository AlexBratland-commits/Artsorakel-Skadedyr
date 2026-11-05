import { NextRequest, NextResponse } from "next/server";

import {
  lesTilgang,
  settTilgangsCookie,
  sjekkKode,
  slettTilgangsCookie,
  tilgangKreves,
  tilgangskoder,
} from "@/lib/server/access";
import { sjekkGrenser, tilgangsforsokRegel } from "@/lib/server/limits";
import { forStorForesporsel, ipNokkel, klientIp, lesBegrensetJson, sjekkOpprinnelse } from "@/lib/server/request-guards";
import { loggHendelse } from "@/lib/server/log";
import { medGrensekontroll } from "@/lib/server/svar";
import { sjekkSikkerhetsoppsett } from "@/lib/server/oppsett";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tilgangskode for ansatte (se src/lib/server/access.ts).
 *
 * GET    → { kreves, innlogget }   – klienten spør om koden trengs
 * POST   → { kode }                – logger inn denne enheten (cookie)
 * DELETE →                         – logger ut denne enheten
 */

export async function GET(request: NextRequest) {
  const ikkeKlar = sjekkSikkerhetsoppsett("tilgang");
  if (ikkeKlar) return ikkeKlar;
  const t = lesTilgang(request);
  return NextResponse.json(
    { kreves: t.kreves, innlogget: t.ok },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const ikkeKlar = sjekkSikkerhetsoppsett("tilgang");
  if (ikkeKlar) return ikkeKlar;
  // Forsøksgrensen ligger i Upstash. Svarer den ikke, stoppes innlogging
  // midlertidig i stedet for å la koden kunne gjettes uten grense.
  return medGrensekontroll("tilgang", () => loggInn(request));
}

async function loggInn(request: NextRequest): Promise<NextResponse> {
  const fremmed = sjekkOpprinnelse(request);
  if (fremmed) return fremmed;

  if (!tilgangKreves()) {
    return NextResponse.json({ ok: true, kreves: false });
  }

  // Begrens antall forsøk, så koden ikke kan gjettes.
  const grense = await sjekkGrenser([tilgangsforsokRegel(ipNokkel(klientIp(request)))]);
  if (!grense.ok) {
    loggHendelse("grense", { rute: "tilgang", regel: grense.regel });
    return NextResponse.json(
      { error: `For mange forsøk. Prøv igjen om ${Math.ceil(grense.retryAfterSeconds / 60)} minutter.` },
      { status: 429, headers: { "Retry-After": String(grense.retryAfterSeconds) } }
    );
  }

  if (forStorForesporsel(request, 4096)) {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  // M2: grensen gjelder faktisk innhold, også uten eller med feil Content-Length.
  const lest = await lesBegrensetJson(request, 4096);
  if (!lest.ok) return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  const kode: unknown = (lest.data as { kode?: unknown } | null)?.kode;

  const gyldig = sjekkKode(kode);
  if (!gyldig) {
    loggHendelse("tilgang", { utfall: "feil_kode" });
    return NextResponse.json({ error: "Feil tilgangskode." }, { status: 401 });
  }

  if (gyldig.length < 8 && tilgangskoder().length > 0) {
    console.warn("⚠️  Tilgangskoden er kortere enn 8 tegn – bruk en lengre kode");
  }
  loggHendelse("tilgang", { utfall: "innlogget" });
  const res = NextResponse.json({ ok: true, kreves: true });
  settTilgangsCookie(res, gyldig);
  return res;
}

export async function DELETE(request: NextRequest) {
  const fremmed = sjekkOpprinnelse(request);
  if (fremmed) return fremmed;
  const res = NextResponse.json({ ok: true });
  slettTilgangsCookie(res);
  return res;
}

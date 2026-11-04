import { NextResponse } from "next/server";
import { erVercelDrift } from "./config";
import { tilgangskoder } from "./access";
import { loggHendelse } from "./log";
import { upstashOppsett } from "./store";

/**
 * Sikkerhetsinnstillinger som MÅ være satt i Vercel Production og Preview.
 * Mangler én, avviser API-ene forespørsler med en tydelig melding i stedet
 * for å starte med svekket sikkerhet. Lokal utvikling er unntatt.
 *
 * Åpen tilgang uten kode krever et bevisst valg: ARTSORAKEL_APEN_TILGANG=1.
 */
export function manglendeSikkerhetsoppsett(): string[] {
  if (!erVercelDrift()) return [];
  const mangler: string[] = [];
  if (!process.env.ARTSORAKEL_HEMMELIGHET?.trim()) mangler.push("ARTSORAKEL_HEMMELIGHET");
  if (!upstashOppsett()) mangler.push("Upstash (KV_REST_API_URL og KV_REST_API_TOKEN)");
  if (tilgangskoder().length === 0 && process.env.ARTSORAKEL_APEN_TILGANG !== "1") {
    mangler.push("ARTSORAKEL_TILGANGSKODE");
  }
  return mangler;
}

export const IKKE_KONFIGURERT_MELDING =
  "Artsorakel er ikke ferdig satt opp på serveren. Kontakt den som administrerer appen.";

/** Returnerer et 503-svar hvis noe mangler, ellers null. Loggfører bare navnene. */
export function sjekkSikkerhetsoppsett(rute: string): NextResponse | null {
  const mangler = manglendeSikkerhetsoppsett();
  if (mangler.length === 0) return null;
  console.error(`❌ Mangler sikkerhetsinnstillinger (${rute}): ${mangler.join(", ")}`);
  loggHendelse("ikke_konfigurert", { rute, antall: mangler.length });
  return NextResponse.json({ error: IKKE_KONFIGURERT_MELDING, kode: "ikke_konfigurert" }, { status: 503 });
}

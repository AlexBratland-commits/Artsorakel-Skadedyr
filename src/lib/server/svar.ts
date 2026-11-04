import { NextResponse } from "next/server";
import { sekunderTilMidnatt } from "./limits";
import { loggHendelse } from "./log";
import { LagerUtilgjengelig } from "./store";

/**
 * Felles svar når appen må stoppe AI-kall av hensyn til kontroll og kostnad.
 */

export const GRENSEKONTROLL_MELDING =
  "Artsorakel er midlertidig utilgjengelig fordi kontrollen av bruksgrenser ikke svarer. Prøv igjen om noen minutter.";

export const KOSTNADSRAMME_MELDING =
  "Artsorakel har nådd dagens kostnadsramme for AI-analyser. Prøv igjen i morgen, eller ring Ocab.";

/** Upstash er satt opp, men svarer ikke: nye AI-kall avvises midlertidig (fail closed). */
export function grensekontrollUtilgjengelig(rute: string): NextResponse {
  loggHendelse("grensekontroll_utilgjengelig", { rute });
  return NextResponse.json(
    { error: GRENSEKONTROLL_MELDING, kode: "grensekontroll_utilgjengelig" },
    { status: 503, headers: { "Retry-After": "60" } }
  );
}

/** Dagens kostnadsramme (USD) er brukt opp. */
export function kostnadsrammeNaadd(rute: string): NextResponse {
  loggHendelse("grense", { rute, regel: "kostnadsramme" });
  return NextResponse.json(
    { error: KOSTNADSRAMME_MELDING, kode: "kostnadsramme" },
    { status: 503, headers: { "Retry-After": String(sekunderTilMidnatt()) } }
  );
}

/** Kjører en handler og gjør LagerUtilgjengelig om til et norsk 503-svar. */
export async function medGrensekontroll(rute: string, handler: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof LagerUtilgjengelig) {
      console.error(`⚠️  Grensekontrollen svarer ikke (${rute}):`, err.message);
      return grensekontrollUtilgjengelig(rute);
    }
    throw err;
  }
}

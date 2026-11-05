/**
 * Kobling mellom funn-chatten og analysen som vises.
 *
 * Meldingene i «Spør om dette funnet» finnes bare i minnet, og chatten
 * startes på nytt for hver analyse. Hver gang et analyseresultat vises (ny
 * analyse eller åpnet fra historikken) får visningen et nytt løpenummer.
 * Chatten rapporterer meldingene sine sammen med løpenummeret og analysens
 * chat-billett (unik per analyse). PDF-en tar bare med meldinger der BEGGE
 * stemmer med det som vises nå.
 *
 * - Tidspunkt brukes ikke til koblingen.
 * - Den generelle chatten («Spør Artsorakel») er en egen komponent og kommer
 *   aldri hit.
 * - Ingenting lagres: lukkes siden eller åpnes et annet funn, er samtalen borte.
 */
import type { AnalysisResult } from "../types";

export interface FunnMelding {
  rolle: "user" | "assistant";
  tekst: string;
  /** Når meldingen ble skrevet (ISO), satt i nettleseren. Bare til visning. */
  tid?: string;
}

export interface LagretFunnSamtale {
  /** Løpenummeret til visningen samtalen hører til. */
  visning: number;
  /** Chat-billetten til analysen samtalen hører til. */
  chatToken?: string;
  meldinger: FunnMelding[];
}

/** Meldingene som trygt kan legges ved rapporten for analysen som vises nå. */
export function samtaleForVisning(
  lagret: LagretFunnSamtale | null | undefined,
  visning: number,
  result: AnalysisResult | null | undefined
): FunnMelding[] {
  if (!lagret || !result) return [];
  if (lagret.visning !== visning) return [];
  // Begge må ha en billett, og de må være like. Uten billett kan funnet ikke ha hatt en samtale.
  if (!lagret.chatToken || !result.chatToken || lagret.chatToken !== result.chatToken) return [];
  return lagret.meldinger.filter((m) => (m.rolle === "user" || m.rolle === "assistant") && m.tekst.trim().length > 0);
}

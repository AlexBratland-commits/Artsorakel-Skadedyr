import fs from "fs";
import path from "path";

/**
 * Samlet lesing av konfigurasjon (miljøvariabler) for API-rutene.
 * Alt leses ved behov, ikke når modulen lastes, slik at tester og
 * Vercel-miljøet alltid ser gjeldende verdier.
 *
 * Alle variabler er dokumentert i .env.example.
 */

let nokkelFraFil: string | null | undefined; // undefined = ikke forsøkt lest ennå

/** OpenRouter-nøkkel: miljøvariabel først, deretter config.json (som før). */
export function openRouterApiKey(): string | undefined {
  const fraMiljo = process.env.OPENROUTER_API_KEY?.trim();
  if (fraMiljo) return fraMiljo;

  if (nokkelFraFil === undefined) {
    try {
      const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config.json"), "utf8"));
      const verdi = typeof config.OPENROUTER_API_KEY === "string" ? config.OPENROUTER_API_KEY.trim() : "";
      nokkelFraFil = verdi || null;
      if (nokkelFraFil) console.log("✅ API-nøkkel lastet fra config.json");
    } catch {
      nokkelFraFil = null;
    }
    if (!nokkelFraFil) {
      console.warn("⚠️  Fant verken OPENROUTER_API_KEY eller config.json – AI-tjenesten er ikke konfigurert");
    }
  }
  return nokkelFraFil ?? undefined;
}

/** Synsmodell for bildeanalyse. Endres bare etter godkjenning. */
export function visionModel(): string {
  return process.env.OPENROUTER_VISION_MODEL?.trim() || "google/gemini-3.7-flash";
}

/** Tekstmodell for chatten. Endres bare etter godkjenning. */
export function chatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL?.trim() || "openai/gpt-5.6-luna";
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Kjører appen i Vercel Production eller Preview? Da gjelder strenge krav:
 * Upstash og signeringshemmelighet må være satt (oppsett.ts),
 * og tellere i minnet brukes aldri. Lokal utvikling (og `vercel dev`) er unntatt.
 */
export function erVercelDrift(): boolean {
  const miljo = process.env.VERCEL_ENV;
  return miljo === "production" || miljo === "preview";
}

/** Kjører appen på Vercel? (Vercel setter VERCEL=1.) */
export function erVercel(): boolean {
  return process.env.VERCEL === "1";
}

/**
 * Testmodus for scripts/eval.mjs: slår av tilgangskode, bruksgrenser og
 * cache, slik at et helt testsett kan kjøres. Virker bare under `next dev`
 * – aldri i produksjon.
 */
export function erEvalModus(): boolean {
  return process.env.EVAL_MODE === "1" && process.env.NODE_ENV !== "production";
}

/** Heltall fra miljøvariabel, med standardverdi og fornuftige grenser. */
export function heltall(navn: string, standard: number, min = 0, maks = 1_000_000): number {
  const raw = process.env[navn];
  if (raw === undefined || raw.trim() === "") return standard;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > maks) {
    console.warn(`⚠️  Ugyldig verdi for ${navn} – bruker ${standard}`);
    return standard;
  }
  return n;
}

/** Kun for tester: glem config.json-nøkkelen som er lest inn. */
export function _nullstillConfigForTester(): void {
  nokkelFraFil = undefined;
}

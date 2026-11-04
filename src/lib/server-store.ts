import type { AnalysisResult } from "./types";

/**
 * Resultatcache: samme bilde + samme felter gir samme svar, uten nytt
 * AI-kall.
 *
 * MERK: Dette er lagring i minnet på én serverinstans. På Vercel nullstilles
 * cachen ved cold start, og hver instans har sin egen kopi. Det er greit for
 * en cache – i verste fall gjøres en analyse på nytt.
 *
 * Bruksgrensene lå tidligere her. De er flyttet til src/lib/server/limits.ts
 * og bruker Upstash, slik at de gjelder på tvers av instanser.
 */

const CACHE_MAX = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { value: AnalysisResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export function getCached(hash: string): AnalysisResult | undefined {
  const hit = cache.get(hash);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(hash);
    return undefined;
  }
  // LRU-oppførsel: flytt bakerst
  cache.delete(hash);
  cache.set(hash, hit);
  return hit.value;
}

export function setCached(hash: string, value: AnalysisResult): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(hash, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

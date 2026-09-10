import type { AnalysisResult } from "./types";

/**
 * MERK: Dette er lagring i minnet på én serverinstans.
 * På Vercel betyr det at både teller og cache nullstilles ved cold start,
 * og at hver instans har sin egen kopi. Det holder som et enkelt vern mot
 * misbruk og dobbeltanalyser, men er ikke en garanti.
 * For hard grense: bytt ut med Vercel KV / Upstash Redis – bare disse to
 * funksjonene må endres.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 time
const MAX_REQUESTS = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  // Enkel opprydding så kartet ikke vokser i det uendelige
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  bucket.count += 1;
  const allowed = bucket.count <= MAX_REQUESTS;

  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

// ── Resultatcache: samme bilde + samme sted gir samme svar ───────────────
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

export const RATE_LIMIT = { WINDOW_MS, MAX_REQUESTS };
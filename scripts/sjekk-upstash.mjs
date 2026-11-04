#!/usr/bin/env node
/**
 * Sjekker at Upstash-oppsettet virker, med nøyaktig samme kall som appen
 * bruker for bruksgrensene (SET NX + INCR + TTL via /pipeline).
 *
 * Kjør med de samme miljøvariablene som i Vercel, for eksempel:
 *   vercel env pull .env.local     (henter variablene fra Vercel)
 *   node --env-file=.env.local scripts/sjekk-upstash.mjs
 *
 * Skriptet øker en egen testteller som slettes av seg selv etter 60 sekunder.
 * Det skriver aldri ut nøkkelen (token).
 */
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error("❌ Fant ikke UPSTASH_REDIS_REST_URL/TOKEN eller KV_REST_API_URL/TOKEN.");
  process.exit(1);
}

const key = "artsorakel:sjekk-upstash";
const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify([
    ["SET", key, "0", "EX", "60", "NX"],
    ["INCR", key],
    ["TTL", key],
  ]),
}).catch((err) => {
  console.error("❌ Fikk ikke kontakt med Upstash:", err.message);
  process.exit(1);
});

const data = await res.json().catch(() => null);
if (!res.ok || !Array.isArray(data) || data.some((d) => d?.error)) {
  console.error(`❌ Upstash svarte ${res.status}:`, JSON.stringify(data)?.slice(0, 300));
  process.exit(1);
}
console.log(`✅ Upstash virker. Testteller = ${data[1].result}, utløper om ${data[2].result} s.`);

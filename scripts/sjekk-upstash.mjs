#!/usr/bin/env node
/**
 * Sjekker at Upstash-oppsettet virker, med nøyaktig de samme Lua-skriptene
 * som appen bruker for bruksgrenser og kostnadsramme (src/lib/server/store.ts).
 * En test (tests/unit/sjekk-upstash-script.test.ts) sikrer at skriptene her
 * er identiske med appens.
 *
 * Kjør med de samme miljøvariablene som i Vercel, for eksempel:
 *   vercel env pull .env.local     (henter variablene fra Vercel)
 *   node --env-file=.env.local scripts/sjekk-upstash.mjs
 *
 * Skriptet bruker egne testnøkler som slettes av seg selv etter 60 sekunder.
 * Det skriver aldri ut nøkkelen (token).
 */

export const LUA_OKN = `local n = redis.call('INCRBY', KEYS[1], ARGV[2])
local t = redis.call('TTL', KEYS[1])
if t < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  t = tonumber(ARGV[1])
end
return {n, t}`;

export const LUA_RESERVER = `local naa = tonumber(redis.call('GET', KEYS[1]) or '0')
local mengde = tonumber(ARGV[2])
if naa + mengde > tonumber(ARGV[3]) then
  return {0, naa}
end
local n = redis.call('INCRBY', KEYS[1], mengde)
if redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {1, n}`;

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error("❌ Fant ikke UPSTASH_REDIS_REST_URL/TOKEN eller KV_REST_API_URL/TOKEN.");
    process.exit(1);
  }

  async function kjor(kommando) {
    const res = await fetch(url.replace(/\/+$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(kommando),
    }).catch((err) => {
      console.error("❌ Fikk ikke kontakt med Upstash:", err.message);
      process.exit(1);
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || "error" in data) {
      console.error(`❌ Upstash svarte ${res.status}:`, JSON.stringify(data)?.slice(0, 300));
      process.exit(1);
    }
    return data.result;
  }

  const [antall, ttl] = await kjor(["EVAL", LUA_OKN, "1", "artsorakel:sjekk:teller", "60", "1"]);
  console.log(`✅ Teller virker: verdi ${antall}, utløper om ${ttl} s.`);

  const [ok, verdi] = await kjor(["EVAL", LUA_RESERVER, "1", "artsorakel:sjekk:ramme", "60", "5", "1000000"]);
  console.log(`✅ Reservasjon virker: ${ok === 1 ? "godtatt" : "avslått"}, verdi ${verdi}.`);
  console.log("Upstash er klart for Artsorakel.");
}

if (import.meta.url === `file://${process.argv[1]}`) await main();

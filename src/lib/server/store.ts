/**
 * Tellere for bruksgrenser, døgnbudsjett og kostnadsramme.
 *
 * I produksjon (Vercel) brukes Upstash Redis, slik at alle serverinstanser
 * deler de samme tellerne. Alle operasjoner er ett Lua-skript, som Redis
 * kjører udelt (atomisk): to samtidige forespørsler kan aldri lese samme
 * verdi og begge slippe gjennom.
 *
 * Er Upstash satt opp, men ikke svarer, kastes LagerUtilgjengelig. API-ene
 * avviser da nye AI-kall midlertidig («fail closed») i stedet for å bruke
 * tellere i minnet, som ikke er felles for instansene og derfor ikke kan
 * håndheve et felles budsjett.
 *
 * Uten Upstash-oppsett (lokal utvikling) brukes tellere i minnet.
 *
 * Upstash brukes via REST-API-et, uten ekstra pakker:
 * https://upstash.com/docs/redis/features/restapi
 */

export interface Teller {
  antall: number;
  utloperOmSek: number;
}

export interface Reservasjonsresultat {
  ok: boolean;
  /** Tellerens verdi etter operasjonen (eller nåverdi hvis avslått). */
  verdi: number;
}

export interface TellerLager {
  readonly navn: "upstash" | "minne";
  /** Øker telleren med `mengde` (standard 1). Nytt vindu starter når det forrige er utløpt. */
  okn(nokkel: string, vinduSek: number, mengde?: number): Promise<Teller>;
  /** Øker med `mengde` bare hvis resultatet ikke overstiger `grense` – i én udelt operasjon. */
  reserver(nokkel: string, mengde: number, grense: number, vinduSek: number): Promise<Reservasjonsresultat>;
}

/** Upstash er satt opp, men svarer ikke eller svarer med feil. */
export class LagerUtilgjengelig extends Error {
  constructor(melding: string) {
    super(melding);
    this.name = "LagerUtilgjengelig";
  }
}

// ── Lua-skript (kjøres atomisk av Redis) ─────────────────────────────────

/** KEYS[1]=nøkkel, ARGV[1]=vindu i sekunder, ARGV[2]=mengde. Returnerer {verdi, ttl}. */
export const LUA_OKN = `local n = redis.call('INCRBY', KEYS[1], ARGV[2])
local t = redis.call('TTL', KEYS[1])
if t < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  t = tonumber(ARGV[1])
end
return {n, t}`;

/** KEYS[1]=nøkkel, ARGV[1]=vindu, ARGV[2]=mengde, ARGV[3]=grense. Returnerer {1|0, verdi}. */
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

// ── Minne (lokal utvikling) ──────────────────────────────────────────────

export class MinneLager implements TellerLager {
  readonly navn = "minne" as const;
  private tellere = new Map<string, { verdi: number; utloper: number }>();

  // JavaScript kjører én ting om gangen, så hver metode er udelt innenfor
  // én prosess. (Den er IKKE felles for flere serverinstanser.)
  private hent(nokkel: string, vinduSek: number) {
    const naa = Date.now();
    let t = this.tellere.get(nokkel);
    if (!t || t.utloper <= naa) {
      t = { verdi: 0, utloper: naa + vinduSek * 1000 };
      this.tellere.set(nokkel, t);
    }
    if (this.tellere.size > 5000) {
      for (const [k, v] of this.tellere) if (v.utloper <= naa) this.tellere.delete(k);
    }
    return t;
  }

  async okn(nokkel: string, vinduSek: number, mengde = 1): Promise<Teller> {
    const t = this.hent(nokkel, vinduSek);
    t.verdi += mengde;
    return { antall: t.verdi, utloperOmSek: Math.max(1, Math.ceil((t.utloper - Date.now()) / 1000)) };
  }

  async reserver(nokkel: string, mengde: number, grense: number, vinduSek: number): Promise<Reservasjonsresultat> {
    const t = this.hent(nokkel, vinduSek);
    if (t.verdi + mengde > grense) return { ok: false, verdi: t.verdi };
    t.verdi += mengde;
    return { ok: true, verdi: t.verdi };
  }
}

// ── Upstash ──────────────────────────────────────────────────────────────

export class UpstashLager implements TellerLager {
  readonly navn = "upstash" as const;
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly timeoutMs = 2000
  ) {}

  private async kjor(kommando: string[]): Promise<unknown> {
    let sisteFeil: unknown;
    // Ett nytt forsøk ved nettverksfeil eller 5xx – ikke ved 4xx (feil oppsett).
    for (let forsok = 0; forsok < 2; forsok++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(this.url.replace(/\/+$/, ""), {
          method: "POST",
          signal: controller.signal,
          cache: "no-store",
          headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(kommando),
        });
        const data = (await res.json().catch(() => null)) as { result?: unknown; error?: unknown } | null;
        if (res.ok && data && !("error" in data)) return data.result;
        sisteFeil = new LagerUtilgjengelig(
          `Upstash svarte ${res.status}${data?.error ? `: ${String(data.error).slice(0, 100)}` : ""}`
        );
        if (res.status < 500) break;
      } catch (err) {
        sisteFeil = new LagerUtilgjengelig(
          err instanceof Error && err.name === "AbortError" ? "Upstash svarte ikke i tide" : "Fikk ikke kontakt med Upstash"
        );
      } finally {
        clearTimeout(timer);
      }
      if (forsok === 0) await new Promise((r) => setTimeout(r, 100));
    }
    throw sisteFeil;
  }

  private static toTall(svar: unknown): [number, number] {
    if (!Array.isArray(svar) || svar.length !== 2) throw new LagerUtilgjengelig("Uventet svar fra Upstash");
    const [a, b] = svar.map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new LagerUtilgjengelig("Uventet svar fra Upstash");
    return [a, b];
  }

  async okn(nokkel: string, vinduSek: number, mengde = 1): Promise<Teller> {
    const [antall, ttl] = UpstashLager.toTall(
      await this.kjor(["EVAL", LUA_OKN, "1", nokkel, String(vinduSek), String(Math.round(mengde))])
    );
    return { antall, utloperOmSek: ttl > 0 ? ttl : vinduSek };
  }

  async reserver(nokkel: string, mengde: number, grense: number, vinduSek: number): Promise<Reservasjonsresultat> {
    const [ok, verdi] = UpstashLager.toTall(
      await this.kjor([
        "EVAL",
        LUA_RESERVER,
        "1",
        nokkel,
        String(vinduSek),
        String(Math.round(mengde)),
        String(Math.round(grense)),
      ])
    );
    return { ok: ok === 1, verdi };
  }
}

// ── Valg av lager ────────────────────────────────────────────────────────

let lager: TellerLager | undefined;

/**
 * Upstash-oppsettet kan komme fra Upstash direkte (UPSTASH_REDIS_REST_*)
 * eller fra Vercel Marketplace-integrasjonen (KV_REST_API_*).
 */
export function upstashOppsett(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

export function tellerLager(): TellerLager {
  if (lager) return lager;
  const oppsett = upstashOppsett();
  if (oppsett) {
    lager = new UpstashLager(oppsett.url, oppsett.token);
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠️  Upstash er ikke satt opp – bruksgrenser og budsjetter gjelder bare per serverinstans"
      );
    }
    lager = new MinneLager();
  }
  return lager;
}

/** Kun for tester. */
export function _settLagerForTester(nytt: TellerLager | undefined): void {
  lager = nytt;
}

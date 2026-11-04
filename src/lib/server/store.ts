/**
 * Tellere for bruksgrenser og døgnbudsjett.
 *
 * I produksjon (Vercel) brukes Upstash Redis, slik at alle serverinstanser
 * deler de samme tellerne. Mangler Upstash-oppsettet, eller svarer ikke
 * Upstash, faller vi tilbake til tellere i minnet på hver instans – samme
 * vern som appen hadde før. Feil i Upstash stopper altså aldri appen.
 *
 * Upstash brukes via REST-API-et deres (pipeline), uten ekstra pakker:
 * https://upstash.com/docs/redis/features/restapi
 */

export interface Teller {
  antall: number;
  utloperOmSek: number;
}

export interface TellerLager {
  readonly navn: "upstash" | "minne";
  /** Øker telleren og starter et nytt vindu hvis det forrige er utløpt. */
  okn(nokkel: string, vinduSek: number): Promise<Teller>;
}

// ── Minne ────────────────────────────────────────────────────────────────

export class MinneLager implements TellerLager {
  readonly navn = "minne" as const;
  private tellere = new Map<string, { antall: number; utloper: number }>();

  async okn(nokkel: string, vinduSek: number): Promise<Teller> {
    const naa = Date.now();
    let t = this.tellere.get(nokkel);
    if (!t || t.utloper <= naa) {
      t = { antall: 0, utloper: naa + vinduSek * 1000 };
      this.tellere.set(nokkel, t);
    }
    // Enkel opprydding så kartet ikke vokser i det uendelige
    if (this.tellere.size > 5000) {
      for (const [k, v] of this.tellere) if (v.utloper <= naa) this.tellere.delete(k);
    }
    t.antall += 1;
    return { antall: t.antall, utloperOmSek: Math.max(1, Math.ceil((t.utloper - naa) / 1000)) };
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

  async okn(nokkel: string, vinduSek: number): Promise<Teller> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.url.replace(/\/+$/, "")}/pipeline`, {
        method: "POST",
        signal: controller.signal,
        cache: "no-store",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        // Opprett telleren med utløpstid bare hvis den ikke finnes, øk den,
        // og les gjenstående tid. INCR beholder utløpstiden.
        body: JSON.stringify([
          ["SET", nokkel, "0", "EX", String(vinduSek), "NX"],
          ["INCR", nokkel],
          ["TTL", nokkel],
        ]),
      });
      if (!res.ok) throw new Error(`Upstash svarte ${res.status}`);
      const data: unknown = await res.json();
      if (!Array.isArray(data) || data.length !== 3) throw new Error("Uventet svar fra Upstash");
      const feil = data.find((d) => d && typeof d === "object" && "error" in d);
      if (feil) throw new Error(`Upstash-feil: ${String((feil as { error: unknown }).error).slice(0, 100)}`);
      const antall = Number((data[1] as { result: unknown }).result);
      const ttl = Number((data[2] as { result: unknown }).result);
      if (!Number.isInteger(antall)) throw new Error("Uventet tellerverdi fra Upstash");
      return { antall, utloperOmSek: ttl > 0 ? ttl : vinduSek };
    } finally {
      clearTimeout(timer);
    }
  }
}

// ── Robust: Upstash med minne som reserve ────────────────────────────────

export class RobustLager implements TellerLager {
  private sisteVarsel = 0;
  constructor(
    private readonly primar: TellerLager,
    private readonly reserve: TellerLager
  ) {}

  get navn() {
    return this.primar.navn;
  }

  async okn(nokkel: string, vinduSek: number): Promise<Teller> {
    try {
      return await this.primar.okn(nokkel, vinduSek);
    } catch (err) {
      const naa = Date.now();
      if (naa - this.sisteVarsel > 60_000) {
        this.sisteVarsel = naa;
        console.error(
          "⚠️  Upstash utilgjengelig – bruker tellere i minnet inntil videre:",
          err instanceof Error ? err.message : "ukjent feil"
        );
      }
      return this.reserve.okn(nokkel, vinduSek);
    }
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
    lager = new RobustLager(new UpstashLager(oppsett.url, oppsett.token), new MinneLager());
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn("⚠️  Upstash er ikke satt opp – bruksgrensene gjelder bare per serverinstans");
    }
    lager = new MinneLager();
  }
  return lager;
}

/** Kun for tester. */
export function _settLagerForTester(nytt: TellerLager | undefined): void {
  lager = nytt;
}

import { siteUrl } from "./config";
import { loggHendelse } from "./log";

/**
 * Felles klient for OpenRouter, brukt av både bildeanalysen og chatten.
 * Forespørselen som sendes er den samme som før – bare samlet ett sted.
 * Hvert kall logges med forbruk (tokens, kostnad om OpenRouter oppgir den),
 * tid og utfall – aldri innhold.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type AiFeil = "timeout" | "rate_limit" | "http" | "network";

export interface Forbruk {
  tokensInn?: number;
  tokensUt?: number;
  kostnadUsd?: number;
}

export type AiSvar =
  | { ok: true; content: string; finishReason: string; forbruk: Forbruk; ms: number }
  | { ok: false; reason: AiFeil; ms: number };

export interface AiKall {
  apiKey: string;
  rute: "analyze" | "chat";
  steg: string;
  model: string;
  messages: unknown[];
  maxTokens: number;
  timeoutMs: number;
  temperature: number;
  /** Be om JSON-svar (response_format), som bildeanalysen alltid har gjort. */
  json?: boolean;
}

function tall(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export async function kallOpenRouter(kall: AiKall): Promise<AiSvar> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), kall.timeoutMs);

  const logg = (utfall: string, extra: Record<string, string | number | undefined> = {}) =>
    loggHendelse("ai_kall", {
      rute: kall.rute,
      steg: kall.steg,
      modell: kall.model,
      utfall,
      ms: Date.now() - start,
      ...extra,
    });

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kall.apiKey}`,
        "HTTP-Referer": siteUrl(),
        "X-Title": "Ocab Artsbestemmer",
      },
      body: JSON.stringify({
        model: kall.model,
        messages: kall.messages,
        temperature: kall.temperature,
        max_tokens: kall.maxTokens,
        ...(kall.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!response.ok) {
      // Bare status og leverandørens korte feilmelding – aldri innholdet vi sendte.
      const detalj = await response
        .json()
        .then((d) => String(d?.error?.message ?? "").slice(0, 160))
        .catch(() => "");
      console.error(`❌ OpenRouter svarte ${response.status}${detalj ? `: ${detalj}` : ""}`);
      const reason: AiFeil = response.status === 429 ? "rate_limit" : "http";
      logg(reason, { status: response.status });
      return { ok: false, reason, ms: Date.now() - start };
    }

    const data = await response.json();
    const valg = data?.choices?.[0];
    const content = typeof valg?.message?.content === "string" ? valg.message.content : "";
    const finishReason = typeof valg?.finish_reason === "string" ? valg.finish_reason : "ukjent";
    const forbruk: Forbruk = {
      tokensInn: tall(data?.usage?.prompt_tokens),
      tokensUt: tall(data?.usage?.completion_tokens),
      kostnadUsd: tall(data?.usage?.cost),
    };
    logg("ok", {
      finish: finishReason,
      tokens_inn: forbruk.tokensInn,
      tokens_ut: forbruk.tokensUt,
      kostnad_usd: forbruk.kostnadUsd,
      svar_tegn: content.length,
    });
    return { ok: true, content, finishReason, forbruk, ms: Date.now() - start };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("⏱️ OpenRouter-kall tok for lang tid");
      logg("timeout");
      return { ok: false, reason: "timeout", ms: Date.now() - start };
    }
    console.error("❌ OpenRouter-kall feilet:", err instanceof Error ? err.message : "ukjent feil");
    logg("network");
    return { ok: false, reason: "network", ms: Date.now() - start };
  } finally {
    clearTimeout(timeout);
  }
}

/** Summerer forbruket fra flere kall (steg 1 + steg 2). */
export function summerForbruk(liste: Forbruk[]): Forbruk {
  const sum = (f: (x: Forbruk) => number | undefined) => {
    const verdier = liste.map(f).filter((v): v is number => v !== undefined);
    return verdier.length ? verdier.reduce((a, b) => a + b, 0) : undefined;
  };
  return { tokensInn: sum((f) => f.tokensInn), tokensUt: sum((f) => f.tokensUt), kostnadUsd: sum((f) => f.kostnadUsd) };
}

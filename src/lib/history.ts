import type { AnalysisResult, HistoryEntry } from "./types";

const KEY = "ocab-skadedyr-historikk";
const MAX_ENTRIES = 20;

/**
 * Øk når artsbiblioteket får faglige rettelser. Eldre lagrede funn får da et
 * diskret varsel, men selve funnet og artsnavnet endres ikke.
 * 2: brun tremaur / stokkmaur rettet etter FHI.
 * 3: pelsbille og rødmus egne arter, aliaser rettet (H1).
 */
export const ARTSDATA_VERSJON = 3;

/** Lagret med eldre artsdata enn dagens? */
export function harEldreArtsdata(entry: Pick<HistoryEntry, "artsdata">): boolean {
  return (entry.artsdata ?? 1) < ARTSDATA_VERSJON;
}

/**
 * L1 (revisjon): lagret historikk kan være ødelagt eller fra en eldre
 * datamodell. Hver oppføring kontrolleres; ugyldige forkastes, slik at en
 * enkelt feil aldri tar ned hele siden. Manglende lister blir tomme lister.
 */
function tilOppforing(verdi: unknown): HistoryEntry | null {
  if (typeof verdi !== "object" || verdi === null) return null;
  const e = verdi as Record<string, unknown>;
  const r = e.resultat as Record<string, unknown> | null | undefined;
  if (typeof e.id !== "string" || typeof e.tid !== "string") return null;
  if (typeof r !== "object" || r === null || typeof r.name !== "string") return null;
  const resultat = {
    ...r,
    tiltak: Array.isArray(r.tiltak) ? r.tiltak.filter((t): t is string => typeof t === "string") : [],
    alternativer: Array.isArray(r.alternativer)
      ? r.alternativer.filter((a) => typeof a === "object" && a !== null && typeof (a as { name?: unknown }).name === "string")
      : [],
  } as unknown as AnalysisResult;
  return {
    id: e.id,
    tid: e.tid,
    thumb: typeof e.thumb === "string" ? e.thumb : "",
    sted: typeof e.sted === "string" ? e.sted : "",
    resultat,
    ...(typeof e.artsdata === "number" ? { artsdata: e.artsdata } : {}),
  };
}

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(tilOppforing).filter((e): e is HistoryEntry => e !== null);
  } catch {
    return [];
  }
}

export function addToHistory(
  resultat: AnalysisResult,
  thumb: string,
  sted: string
): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tid: new Date().toISOString(),
    thumb,
    sted,
    resultat,
    artsdata: ARTSDATA_VERSJON,
  };
  const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
  write(next);
  return next;
}

export function removeFromHistory(id: string): HistoryEntry[] {
  const next = readHistory().filter((e) => e.id !== id);
  write(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  write([]);
  return [];
}

function write(entries: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Kvoten kan være full – dropp de eldste og prøv én gang til.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 5)));
    } catch {
      /* gi opp stille – historikk er ikke kritisk */
    }
  }
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("nb-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
import type { AnalysisResult, HistoryEntry } from "./types";

const KEY = "ocab-skadedyr-historikk";
const MAX_ENTRIES = 20;

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
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
"use client";

import { Trash2 } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";
import { formatTime } from "@/lib/history";
import { LOCATIONS, SIKKERHET_ETIKETT, sikkerhetsnivaa } from "@/lib/types";

export default function HistoryPanel({
  entries,
  onOpen,
  onRemove,
  onClear,
}: {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="no-print mt-12" aria-labelledby="historikk-tittel">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="historikk-tittel" className="text-sm font-semibold">
          Tidligere bilder på denne enheten
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted underline underline-offset-4"
        >
          Tøm listen
        </button>
      </div>

      <ul className="mt-3 divide-y hairline overflow-hidden rounded-card surface">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 p-3">
            <button
              type="button"
              onClick={() => onOpen(e)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              {e.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.thumb}
                  alt=""
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="size-12 shrink-0 rounded-md bg-[color:var(--surface-sunken)]" />
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {e.resultat.annenArt ? `Mulig ${e.resultat.annenArt.name}` : e.resultat.name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {formatTime(e.tid)}
                  {e.sted && ` · ${stedLabel(e.sted)}`}
                  {e.resultat.found &&
                    ` · ${SIKKERHET_ETIKETT[sikkerhetsnivaa(e.resultat.confidence)]}`}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onRemove(e.id)}
              aria-label={`Slett ${e.resultat.name} fra listen`}
              className="rounded-full p-2 text-muted transition hover:bg-[color:var(--surface-sunken)]"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-muted">
        Listen ligger bare i denne nettleseren. Bildene sendes ikke til Ocab.
      </p>
    </section>
  );
}

function stedLabel(value: string): string {
  return LOCATIONS.find((l) => l.value === value)?.label ?? value;
}
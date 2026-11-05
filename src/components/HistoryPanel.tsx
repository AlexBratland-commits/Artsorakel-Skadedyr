"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";
import { formatTime } from "@/lib/history";
import { LOCATIONS, SIKKERHET_ETIKETT, sikkerhetsnivaa } from "@/lib/types";

const FORSIDE_ANTALL = 3;

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
  const [visAlle, setVisAlle] = useState(false);
  if (entries.length === 0) return null;
  // Forsiden viser de tre siste. Resten er ett trykk unna, med samme
  // muligheter til å åpne og slette.
  const synlige = visAlle ? entries : entries.slice(0, FORSIDE_ANTALL);

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
        {synlige.map((e) => (
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
                  {e.resultat.annenArt
                    ? `Mulig ${e.resultat.annenArt.name}`
                    : e.resultat.found
                      ? e.resultat.usikkerKandidat
                        ? `Mulig ${e.resultat.name}`
                        : e.resultat.name
                      : e.resultat.ikkeSkadedyr
                        ? "Ingen skadedyr på bildet"
                        : "Ikke identifisert sikkert"}
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

      {entries.length > FORSIDE_ANTALL && (
        <button
          type="button"
          onClick={() => setVisAlle((v) => !v)}
          aria-expanded={visAlle}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ocab-900/20 px-4 py-2 text-sm font-semibold transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
        >
          {visAlle ? (
            <>
              <ChevronUp className="size-4" aria-hidden />
              Vis bare de siste
            </>
          ) : (
            <>
              <ChevronDown className="size-4" aria-hidden />
              Se alle tidligere funn ({entries.length})
            </>
          )}
        </button>
      )}

      <p className="mt-2 text-xs text-muted">
        Listen og miniatyrbildene ligger bare i denne nettleseren.
      </p>
    </section>
  );
}

function stedLabel(value: string): string {
  return LOCATIONS.find((l) => l.value === value)?.label ?? value;
}
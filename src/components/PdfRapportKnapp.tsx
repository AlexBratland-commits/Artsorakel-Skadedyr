"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileDown, Loader2, X } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { lagRapportbilde } from "@/lib/image-tools";
import { useToast } from "./Toast";
import type { FunnMelding } from "@/lib/rapport/samtale";

/** Det PDF-rapporten trenger i tillegg til selve analyseresultatet. */
export interface RapportKontekst {
  /** Bildet som ble analysert (fil), eller miniatyrbildet fra historikken (data-URL). */
  bilde?: Blob | string | null;
  /** ISO-tidspunkt for analysen. */
  analyseTid?: string;
  /** Funnstedet brukeren valgte. */
  sted?: string;
}

const LOGO = "/icons/ocab-logo-merke.png";

/** Miniatyrbildet i historikken er en data-URL. Leses lokalt (fetch av data: er blokkert av CSP). */
function dataUrlTilBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);
  if (!m) return null;
  try {
    const raa = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const bytes = Uint8Array.from(raa, (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: m[1] || "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * «Last ned PDF-rapport». Rapporten lages lokalt i nettleseren fra det
 * eksisterende analyseresultatet – ingen ny AI-analyse, og bildet sendes
 * ikke til noen ekstern tjeneste.
 */
export default function PdfRapportKnapp({
  result,
  eldreArtsdata = false,
  kontekst,
  samtale = [],
}: {
  result: AnalysisResult;
  eldreArtsdata?: boolean;
  kontekst?: RapportKontekst;
  /** Samtalen om dette funnet, allerede kontrollert mot visningen (samtale.ts). */
  samtale?: FunnMelding[];
}) {
  const { vis } = useToast();
  const [lager, setLager] = useState(false);
  const [apen, setApen] = useState(false);
  const [medSamtale, setMedSamtale] = useState(false);
  const harSamtale = samtale.length > 0;
  const knappRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const lukk = useCallback(() => {
    setApen(false);
    requestAnimationFrame(() => knappRef.current?.focus());
  }, []);

  const apne = () => {
    setMedSamtale(false); // alltid av som standard
    setApen(true);
  };

  // Esc lukker, og fokus holdes inne i dialogen.
  useEffect(() => {
    if (!apen) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("input:not([disabled]), [data-standard]")?.focus();
    const tast = (e: KeyboardEvent) => {
      if (e.key === "Escape") lukk();
      if (e.key !== "Tab" || !dialog) return;
      const fokuserbare = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])")];
      const forste = fokuserbare[0];
      const siste = fokuserbare.at(-1);
      if (e.shiftKey && document.activeElement === forste) {
        e.preventDefault();
        siste?.focus();
      } else if (!e.shiftKey && document.activeElement === siste) {
        e.preventDefault();
        forste?.focus();
      }
    };
    window.addEventListener("keydown", tast);
    return () => window.removeEventListener("keydown", tast);
  }, [apen, lukk]);

  const lastNed = async () => {
    if (lager) return;
    const taMed = medSamtale && harSamtale;
    setApen(false);
    setLager(true);
    try {
      const [{ lagRapportInnhold, lagSamtaleVedlegg }, { lagPdfRapport }] = await Promise.all([
        import("@/lib/rapport/innhold"),
        import("@/lib/rapport/pdf"),
      ]);
      const logo = new Uint8Array(await (await fetch(LOGO)).arrayBuffer());

      const kilde = kontekst?.bilde;
      const miniatyr = typeof kilde === "string";
      const blob = typeof kilde === "string" ? dataUrlTilBlob(kilde) : kilde ?? null;
      const jpg = blob ? await lagRapportbilde(blob) : null;

      const analyseTid = kontekst?.analyseTid ? new Date(kontekst.analyseTid) : new Date();
      const innhold = lagRapportInnhold(result, {
        analyseTid,
        sted: kontekst?.sted,
        eldreArtsdata,
      });
      const { bytes } = await lagPdfRapport(
        innhold,
        logo,
        jpg
          ? {
              jpg,
              merknad: miniatyr
                ? "Miniatyrbilde fra historikken på denne enheten. Originalbildet lagres ikke."
                : undefined,
            }
          : undefined,
        taMed ? lagSamtaleVedlegg(samtale, analyseTid) : undefined
      );

      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = innhold.filnavn;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      vis("PDF-rapporten er laget.", "ok");
    } catch {
      vis("Kunne ikke lage PDF-rapporten. Prøv igjen.", "feil");
    } finally {
      setLager(false);
      requestAnimationFrame(() => knappRef.current?.focus());
    }
  };

  return (
    <div>
      <button
        ref={knappRef}
        type="button"
        onClick={apne}
        disabled={lager}
        aria-busy={lager}
        aria-haspopup="dialog"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-ocab-900 bg-ocab-50 px-5 py-2.5 text-sm font-semibold text-ocab-900 transition hover:bg-ocab-100 active:scale-[0.98] disabled:opacity-60 sm:w-auto dark:border-ocab-200 dark:bg-ocab-900/30 dark:text-ocab-100 dark:hover:bg-ocab-900/50"
      >
        {lager ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
        {lager ? "Lager PDF …" : "Last ned PDF-rapport"}
      </button>
      <p className="mt-2 text-xs text-muted">
        Rapporten lages på enheten din. Den er AI-generert og veiledende.
      </p>

      {/* Portal til <body>: resultatkortet har en transform-animasjon, og da ville
          «fixed» ellers blitt plassert i forhold til kortet, ikke skjermen. */}
      {apen && createPortal(
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-ocab-950/50 sm:items-center sm:p-4"
          onClick={lukk}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-tittel`}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl bg-[color:var(--surface)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-lifted sm:max-w-md sm:rounded-card sm:pb-5"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={`${id}-tittel`} className="text-lg font-bold text-ocab-900 dark:text-white">
                Last ned PDF-rapport
              </h2>
              <button
                type="button"
                onClick={lukk}
                aria-label="Lukk"
                className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-[color:var(--surface-sunken)]"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <label
              htmlFor={`${id}-samtale`}
              className={`mt-4 flex gap-3 rounded-lg border hairline p-4 ${harSamtale ? "cursor-pointer" : "opacity-70"}`}
            >
              <input
                id={`${id}-samtale`}
                type="checkbox"
                checked={medSamtale}
                disabled={!harSamtale}
                onChange={(e) => setMedSamtale(e.target.checked)}
                aria-describedby={`${id}-forklaring${harSamtale ? "" : ` ${id}-ingen`}`}
                className="mt-0.5 size-5 shrink-0 accent-[#003366] dark:accent-[#b9d2e8]"
              />
              <span>
                <span className="block text-sm font-semibold">Inkluder samtale med Artsorakel</span>
                <span id={`${id}-forklaring`} className="mt-1 block text-sm leading-relaxed text-muted">
                  Samtalen legges ved som egne sider etter analyserapporten. Kun meldinger knyttet til
                  dette funnet tas med.
                </span>
              </span>
            </label>
            {!harSamtale && (
              <p id={`${id}-ingen`} className="mt-2 text-xs leading-relaxed text-muted">
                Det finnes ingen samtale om dette funnet. Samtaler lagres ikke, så bare spørsmål du
                stiller i «Spør om dette funnet» mens funnet er åpent, kan legges ved.
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={lukk}
                className="rounded-full border border-ocab-900/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
              >
                Avbryt
              </button>
              <button
                type="button"
                data-standard=""
                onClick={lastNed}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ocab-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ocab-950 active:scale-[0.98] dark:bg-ocab-200 dark:text-ocab-950 dark:hover:bg-white"
              >
                <FileDown className="size-4" aria-hidden />
                Last ned rapport
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

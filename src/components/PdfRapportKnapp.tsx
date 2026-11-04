"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { lagRapportbilde } from "@/lib/image-tools";
import { useToast } from "./Toast";

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
}: {
  result: AnalysisResult;
  eldreArtsdata?: boolean;
  kontekst?: RapportKontekst;
}) {
  const { vis } = useToast();
  const [lager, setLager] = useState(false);

  const lastNed = async () => {
    if (lager) return;
    setLager(true);
    try {
      const [{ lagRapportInnhold }, { lagPdfRapport }] = await Promise.all([
        import("@/lib/rapport/innhold"),
        import("@/lib/rapport/pdf"),
      ]);
      const logo = new Uint8Array(await (await fetch(LOGO)).arrayBuffer());

      const kilde = kontekst?.bilde;
      const miniatyr = typeof kilde === "string";
      const blob = typeof kilde === "string" ? dataUrlTilBlob(kilde) : kilde ?? null;
      const jpg = blob ? await lagRapportbilde(blob) : null;

      const innhold = lagRapportInnhold(result, {
        analyseTid: kontekst?.analyseTid ? new Date(kontekst.analyseTid) : new Date(),
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
          : undefined
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
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={lastNed}
        disabled={lager}
        aria-busy={lager}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-ocab-900 bg-ocab-50 px-5 py-2.5 text-sm font-semibold text-ocab-900 transition hover:bg-ocab-100 active:scale-[0.98] disabled:opacity-60 sm:w-auto dark:border-ocab-200 dark:bg-ocab-900/30 dark:text-ocab-100 dark:hover:bg-ocab-900/50"
      >
        {lager ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
        {lager ? "Lager PDF …" : "Last ned PDF-rapport"}
      </button>
      <p className="mt-2 text-xs text-muted">
        Rapporten lages på enheten din. Den er AI-generert og veiledende.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import {
  CalendarRange,
  ExternalLink,
  Flag,
  MapPinned,
  Phone,
  Printer,
  RotateCcw,
  Share2,
} from "lucide-react";
import {
  SIKKERHET_ETIKETT,
  sikkerhetsnivaa,
  type AnalysisResult,
  type Severity,
} from "@/lib/types";
import { useToast } from "./Toast";

const SEVERITY: Record<Severity, { etikett: string, farge: string, tekst: string }> = {
  lav: {
    etikett: "Lite alvorlig",
    farge: "bg-grad-lav",
    tekst: "Sjelden behov for profesjonell hjelp.",
  },
  middels: {
    etikett: "Bør følges opp",
    farge: "bg-grad-middels",
    tekst: "Gjør tiltak nå, så slipper du et større problem senere.",
  },
  høy: {
    etikett: "Bør håndteres raskt",
    farge: "bg-grad-hoy",
    tekst: "Denne arten sprer seg eller gjør skade – ta kontakt med fagfolk.",
  },
};

const OCAB_TELEFON = "+4740003527"; // ← bytt til riktig nummer
const OCAB_SKADEDYR = "https://www.ocab.no/skade/skadedyr/";

export default function ResultDisplay({
  result,
  onReset,
}: {
  result: AnalysisResult | null;
  onReset: () => void;
}) {
  const { vis } = useToast();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (result) ref.current?.focus();
  }, [result]);

  if (!result) return null;

  const grad = SEVERITY[result.severity] ?? SEVERITY.middels;
  const nivaa = sikkerhetsnivaa(result.confidence);
  const nivaaTrinn = { lav: 1, middels: 2, høy: 3 }[nivaa];
  const usikker = nivaa !== "høy";
  const visningsnavn =
    result.found && result.usikkerKandidat ? `Mulig ${result.name}` : result.name;

  const delingstekst = result.found
    ? `Artsbestemmelse fra Ocab: ${visningsnavn} (${result.latinName}). ${result.description}`
    : "Ocab Artsbestemmer klarte ikke å bestemme arten på bildet.";

  const del = async () => {
    const url = typeof window !== "undefined" ? window.location.href : OCAB_SKADEDYR;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Artsbestemmelse fra Ocab", text: delingstekst, url });
        return;
      } catch {
        return; // brukeren avbrøt
      }
    }
    try {
      await navigator.clipboard.writeText(`${delingstekst}\n${url}`);
      vis("Resultatet er kopiert.", "ok");
    } catch {
      vis("Kunne ikke kopiere. Marker teksten og kopier manuelt.", "feil");
    }
  };

  const epost = `mailto:?subject=${encodeURIComponent(
    `Artsbestemmelse: ${visningsnavn}`
  )}&body=${encodeURIComponent(delingstekst)}`;

  const rapporter = `mailto:post@ocab.no?subject=${encodeURIComponent(
    `Feil artsbestemmelse: ${visningsnavn}`
  )}&body=${encodeURIComponent(
    `Appen foreslo ${visningsnavn} (${result.latinName}), sikkerhet: ${SIKKERHET_ETIKETT[nivaa].toLowerCase()} (modellens tall: ${result.confidence}).\n\nJeg tror det egentlig er: \n\nHva jeg så: \n`
  )}`;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-live="polite"
      className="animate-slip-in print-sheet mt-8 overflow-hidden rounded-card surface shadow-lifted outline-none"
    >
      {/* Fargeryggen bærer alvorlighetsgraden */}
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${grad.farge}`} aria-hidden />

        <div className="min-w-0 flex-1">
          <header className="border-b hairline px-5 py-5 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted print-only">
              Ocab Artsbestemmer
            </p>

            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-ocab-900 sm:text-4xl dark:text-white">
              {visningsnavn}
            </h2>
            {result.found && (
              <p className="mt-1 text-lg italic text-muted">{result.latinName}</p>
            )}
            {result.usikkerKandidat && (
              <p className="mt-2 max-w-prose text-sm text-muted">
                Dette er det mest sannsynlige forslaget, men sikkerheten er for
                lav til en trygg bestemmelse. Bruk kjennetegnene under til å
                sjekke selv, eller kontakt Ocab for bekreftelse.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className={`rounded-full px-3 py-1 font-semibold text-white ${grad.farge}`}>
                {grad.etikett}
              </span>
              {result.gruppe && <span className="text-muted">{result.gruppe}</span>}
              {result.cached && (
                <span className="text-muted">Samme bilde som sist – lagret svar</span>
              )}
            </div>
          </header>

          <div className="space-y-6 px-5 py-6 sm:px-7">
            <p className="max-w-prose text-base leading-relaxed">{result.description}</p>

            {result.observasjon && (
              <p className="max-w-prose border-l-2 border-[color:var(--hairline)] pl-4 text-sm text-muted">
                Dette er det analysen mener å se på bildet: {result.observasjon}
              </p>
            )}

            {result.found && (
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-semibold">Sikkerhet i bestemmelsen</span>
                  <span className="text-sm font-semibold">{SIKKERHET_ETIKETT[nivaa]}</span>
                </div>
                <div
                  className="mt-2 grid grid-cols-3 gap-1"
                  role="meter"
                  aria-valuenow={nivaaTrinn}
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-valuetext={SIKKERHET_ETIKETT[nivaa]}
                  aria-label="Sikkerhet i bestemmelsen"
                >
                  {[1, 2, 3].map((trinn) => (
                    <div
                      key={trinn}
                      className={`h-2 rounded-full ${
                        trinn > nivaaTrinn
                          ? "bg-[color:var(--surface-sunken)]"
                          : usikker
                            ? "bg-grad-middels"
                            : "bg-ocab-900 dark:bg-ocab-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Dette er modellens egen vurdering av bildet, ikke en måling.
                  {usikker && " Ved lav eller middels sikkerhet bør bestemmelsen bekreftes av en fagperson."}
                </p>
              </div>
            )}

            {result.alternativer.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Kan også være</h3>
                <ul className="mt-3 space-y-2">
                  {result.alternativer.map((alt) => (
                    <li
                      key={alt.name}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-[color:var(--surface-sunken)] px-4 py-3 text-sm"
                    >
                      <span className="font-semibold">{alt.name}</span>
                      <span className="italic text-muted">{alt.latinName}</span>
                      <span className="ml-auto shrink-0 text-muted">
                        {SIKKERHET_ETIKETT[sikkerhetsnivaa(alt.confidence)]}
                      </span>
                      {alt.hvorfor && (
                        <span className="w-full text-muted">{alt.hvorfor}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(result.utbredelse || result.sesong) && (
              <dl className="grid gap-4 sm:grid-cols-2">
                {result.utbredelse && (
                  <div className="rounded-lg bg-[color:var(--surface-sunken)] p-4">
                    <dt className="flex items-center gap-2 text-sm font-semibold">
                      <MapPinned className="size-4 text-ocab-500" aria-hidden />
                      Utbredelse i Norge
                    </dt>
                    <dd className="mt-1 text-sm text-muted">{result.utbredelse}</dd>
                  </div>
                )}
                {result.sesong && (
                  <div className="rounded-lg bg-[color:var(--surface-sunken)] p-4">
                    <dt className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarRange className="size-4 text-ocab-500" aria-hidden />
                      Når den er aktiv
                    </dt>
                    <dd className="mt-1 text-sm text-muted">{result.sesong}</dd>
                  </div>
                )}
              </dl>
            )}

            {result.tiltak.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Dette bør du gjøre</h3>
                <ul className="mt-3 space-y-2.5">
                  {result.tiltak.map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-signal-500"
                        aria-hidden
                      />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">{grad.tekst}</p>
              </div>
            )}

            {result.bekreftelse && result.bekreftelse.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Slik bekrefter du funnet</h3>
                <ul className="mt-3 space-y-2">
                  {result.bekreftelse.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-ocab-500"
                        aria-hidden
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.notat && (
              <p className="rounded-lg border-l-2 border-ocab-500 bg-ocab-50 px-4 py-3 text-sm dark:bg-ocab-900/20">
                {result.notat}
              </p>
            )}

            {result.forveksles && result.forveksles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Slik skiller du den fra liknende arter</h3>
                <ul className="mt-3 space-y-2">
                  {result.forveksles.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-[color:var(--hairline)]"
                        aria-hidden
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.gruppe === "Ekskrementer" && (
              <p className="rounded-lg border-l-2 border-signal-500 bg-signal-100/50 px-4 py-3 text-sm dark:bg-signal-600/10">
                Dette er en AI-vurdering basert på bilde og oppgitte kjennetegn,
                ikke en laboratorieprøve. Er du usikker, eller gjelder det et
                sted der sikker bestemmelse er viktig – kontakt Ocab for
                bekreftelse.
              </p>
            )}

            <p className="rounded-lg border-l-2 border-signal-500 bg-signal-100/50 px-4 py-3 text-sm dark:bg-signal-600/10">
              Svaret er et forslag fra en bildeanalyse og kan være feil. Arter som
              ligner på hverandre – for eksempel skjeggkre og sølvkre – krever
              limfeller og en fagperson for sikker bestemmelse.
            </p>

            {/* Handlinger */}
            <div className="no-print flex flex-wrap gap-2 border-t hairline pt-5">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-full bg-ocab-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ocab-950 active:scale-[0.98]"
              >
                <RotateCcw className="size-4" aria-hidden />
                Last opp nytt bilde
              </button>

              <a
                href={`tel:${OCAB_TELEFON}`}
                className="inline-flex items-center gap-2 rounded-full bg-signal-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-signal-600"
              >
                <Phone className="size-4" aria-hidden />
                Ring Ocab
              </a>

              <button
                type="button"
                onClick={del}
                className="inline-flex items-center gap-2 rounded-full border border-ocab-900/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
              >
                <Share2 className="size-4" aria-hidden />
                Del
              </button>

              <a
                href={epost}
                className="inline-flex items-center gap-2 rounded-full border border-ocab-900/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
              >
                Send på e-post
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-ocab-900/20 px-5 py-2.5 text-sm font-semibold transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
              >
                <Printer className="size-4" aria-hidden />
                Skriv ut
              </button>
            </div>

            <div className="no-print flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a
                href={result.fhiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-ocab-700 underline underline-offset-4 dark:text-ocab-200"
              >
                Les mer i FHIs skadedyrhåndbok
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <a
                href={rapporter}
                className="inline-flex items-center gap-1.5 text-muted underline underline-offset-4"
              >
                <Flag className="size-3.5" aria-hidden />
                Meld fra om feil bestemmelse
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
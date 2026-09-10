"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { useToast } from "./Toast";

interface Melding {
  role: "user" | "assistant";
  content: string;
}

const FORSLAG = [
  "Er den farlig?",
  "Hvordan blir jeg kvitt den?",
  "Bør jeg ringe fagfolk?",
  "Hvorfor har jeg fått den inn?",
];

export default function AskAboutFinding({ result }: { result: AnalysisResult }) {
  const [meldinger, setMeldinger] = useState<Melding[]>([]);
  const [utkast, setUtkast] = useState("");
  const [venter, setVenter] = useState(false);
  const listeRef = useRef<HTMLDivElement>(null);
  const { vis } = useToast();

  // Samtalen nullstilles ved å remonte komponenten via key={result.name} i page.tsx.

  useEffect(() => {
    listeRef.current?.scrollTo({ top: listeRef.current.scrollHeight, behavior: "smooth" });
  }, [meldinger, venter]);

  if (!result.found) return null;

  const send = async (tekst: string) => {
    const sporsmal = tekst.trim();
    if (!sporsmal || venter) return;

    const neste: Melding[] = [...meldinger, { role: "user", content: sporsmal }];
    setMeldinger(neste);
    setUtkast("");
    setVenter(true);

    try {
      const response = await fetch("/api/ask-about-findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ art: result.name, messages: neste }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) throw new Error(data?.error ?? "Fikk ikke svar. Prøv igjen.");

      const svar = typeof data?.svar === "string" ? data.svar : "";
      if (!svar) throw new Error("Tomt svar fra tjenesten. Prøv igjen.");

      if (process.env.NODE_ENV !== "production") {
        console.log(`💬 Mottok ${svar.length} tegn fra /api/ask-about-findings`);
      }
      if (data?.avkuttet) {
        vis("Svaret ble avkortet. Still gjerne et mer avgrenset spørsmål.", "info");
      }

      setMeldinger([...neste, { role: "assistant", content: svar }]);
    } catch (error) {
      setMeldinger(meldinger); // rull tilbake, så brukeren kan prøve på nytt
      setUtkast(sporsmal);
      vis(error instanceof Error ? error.message : "Fikk ikke svar.", "feil");
    } finally {
      setVenter(false);
    }
  };

  return (
    <section
      className="no-print mt-6 overflow-hidden rounded-card surface shadow-raised"
      aria-labelledby="chat-tittel"
    >
      <div className="flex items-start gap-3 border-b hairline px-5 py-4">
        <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-ocab-500" aria-hidden />
        <div>
          <h2 id="chat-tittel" className="text-sm font-semibold">
            Spør om dette funnet
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Svarene gjelder {result.name.toLowerCase()} og er veiledende.
          </p>
        </div>
      </div>

      {meldinger.length > 0 && (
        <div
          ref={listeRef}
          className="max-h-80 space-y-3 overflow-y-auto px-5 py-4"
          aria-live="polite"
        >
          {meldinger.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ocab-900 px-4 py-2.5 text-white"
                  : "w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-[color:var(--surface-sunken)] px-4 py-2.5"
              }
            >
              {/* whitespace-pre-wrap beholder linjeskift fra modellen,
                  break-words hindrer at lange ord sprenger boblen. */}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {m.content}
              </p>
            </div>
          ))}
          {venter && (
            <p className="w-fit rounded-2xl rounded-bl-sm bg-[color:var(--surface-sunken)] px-4 py-2.5 text-sm text-muted">
              Skriver …
            </p>
          )}
        </div>
      )}

      {meldinger.length === 0 && (
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {FORSLAG.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => send(f)}
              className="rounded-full border border-ocab-900/20 px-4 py-2 text-sm transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t hairline p-3">
        <input
          value={utkast}
          onChange={(e) => setUtkast(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(utkast);
            }
          }}
          maxLength={500}
          disabled={venter}
          placeholder={`Spør om ${result.name.toLowerCase()} …`}
          aria-label="Skriv spørsmålet ditt"
          className="min-w-0 flex-1 rounded-full bg-[color:var(--surface-sunken)] px-4 py-2.5 text-sm outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => send(utkast)}
          disabled={venter || utkast.trim().length === 0}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-signal-500 text-white transition hover:bg-signal-600 disabled:opacity-40"
          aria-label="Send spørsmål"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>

      <p className="border-t hairline px-5 py-3 text-xs text-muted">
        Dette er en automatisk assistent, ikke en fagperson. Den gir ikke råd om
        kjemiske midler, priser eller juridiske spørsmål.{" "}
        <a
          href="https://www.ocab.no/skade/skadedyr/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Snakk med Ocab
        </a>{" "}
        hvis du trenger en vurdering.
      </p>
    </section>
  );
}
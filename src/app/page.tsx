"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import ImageUploader from "@/components/ImageUploader";
import ResultDisplay from "@/components/ResultDisplay";
import HistoryPanel from "@/components/HistoryPanel";
import InstallBanner from "@/components/InstallBanner";
import ThemeToggle from "@/components/ThemeToggle";
import OcabLogo from "@/components/OcabLogo";
import AskAboutFinding from "@/components/AskAboutFinding";
import { useToast } from "@/components/Toast";

import { compressImage, makeThumbnail } from "@/lib/image-tools";
import { addToHistory, clearHistory, readHistory, removeFromHistory } from "@/lib/history";
import {
  LOCATIONS,
  DROPPING_SIZES,
  type AnalysisResult,
  type HistoryEntry,
} from "@/lib/types";

const SIZES = [
  "under 5 mm (mindre enn et riskorn)",
  "5–10 mm (som et riskorn til en ert)",
  "1–3 cm (som en femkroning)",
  "3–10 cm (som en fyrstikkeske til en hånd)",
  "større enn 10 cm",
];

type AnalyseType = "dyr" | "ekskrementer";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyserer, setAnalyserer] = useState(false);
  const [fremdrift, setFremdrift] = useState(0);
  const [sted, setSted] = useState("");
  const [storrelse, setStorrelse] = useState("");
  const [analyseType, setAnalyseType] = useState<AnalyseType>("dyr");
  const [droppingSize, setDroppingSize] = useState("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const [notesAnimal, setNotesAnimal] = useState("");
  const [historikk, setHistorikk] = useState<HistoryEntry[]>([]);

  const previewUrl = useRef<string | null>(null);
  const { vis } = useToast();

  // Historikk leses fra localStorage én gang etter mount (kun tilgjengelig på klienten).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHistorikk(readHistory()), []);

  // Rydd opp objekt-URL-en når komponenten forsvinner
  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  const velgBilde = useCallback((valgt: File | null) => {
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
    setResult(null);
    setFile(valgt);

    if (valgt) {
      const url = URL.createObjectURL(valgt);
      previewUrl.current = url;
      setPreview(url);
    } else {
      setPreview(null);
      setSted("");
      setStorrelse("");
      setAnalyseType("dyr");
      setDroppingSize("");
      setBeskrivelse("");
      setNotesAnimal("");
    }
  }, []);

  const analyser = async () => {
    if (!file || analyserer) return;

    setAnalyserer(true);
    setResult(null);
    setFremdrift(8);

    // Fremdriften er et estimat, ikke en måling – den stopper på 90 %
    // og fylles helt når svaret faktisk er der.
    const timer = window.setInterval(() => {
      setFremdrift((f) => (f >= 90 ? f : f + Math.max(1, (90 - f) * 0.08)));
    }, 220);

    try {
      const { file: klar, originalBytes, compressed } = await compressImage(file);
      if (compressed && originalBytes > klar.size * 1.5) {
        vis("Bildet ble komprimert før opplasting.", "info");
      }

      const formData = new FormData();
      formData.append("image", klar);
      formData.append("location", sted);
      formData.append("storrelse", storrelse);
      formData.append("type", analyseType);
      if (analyseType === "ekskrementer") {
        formData.append("droppingSize", droppingSize);
        formData.append("beskrivelse", beskrivelse);
      } else {
        formData.append("notesAnimal", notesAnimal);
      }

      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Analysen feilet. Prøv igjen.");
      }

      const analysis = data as AnalysisResult;
      setFremdrift(100);
      setResult(analysis);

      const thumb = await makeThumbnail(klar);
      setHistorikk(addToHistory(analysis, thumb, sted));

      if (!analysis.found && !analysis.annenArt) {
        vis("Ingen sikker match. Prøv et skarpere bilde nærmere dyret.", "info");
      }
    } catch (error) {
      const melding =
        error instanceof Error ? error.message : "Noe gikk galt. Prøv igjen.";
      vis(melding, "feil");
    } finally {
      window.clearInterval(timer);
      setAnalyserer(false);
      window.setTimeout(() => setFremdrift(0), 500);
    }
  };

  const nyttBilde = () => {
    velgBilde(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-10 sm:px-6">
      <header className="no-print flex items-center justify-between gap-4 py-6">
        <a href="https://www.ocab.no/" target="_blank" rel="noopener noreferrer">
          <OcabLogo height={26} />
        </a>
        <ThemeToggle />
      </header>

      <main id="innhold" className="flex-1">
        <div className="pb-8 pt-2">
          <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ocab-900 sm:text-5xl dark:text-white">
            Hva er det du har funnet?
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
            Ta et bilde, så foreslår vi hvilken art det er, hvor alvorlig det er
            og hva du bør gjøre videre.
          </p>
        </div>

        <ImageUploader
          onImageSelect={velgBilde}
          imagePreview={preview}
          fileName={file?.name}
          fileSize={file?.size}
          disabled={analyserer}
        />

        {file && !result && (
          <div className="no-print mt-6 animate-stagger-in">
            <span className="block text-sm font-semibold">Hva vil du artsbestemme?</span>
            <p className="mt-1 text-sm text-muted">
              Velg ekskrementer hvis bildet viser avføring, ikke selve dyret.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAnalyseType("dyr")}
                disabled={analyserer}
                aria-pressed={analyseType === "dyr"}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold shadow-flat transition disabled:opacity-50 ${
                  analyseType === "dyr"
                    ? "border-ocab-900 bg-ocab-900 text-white dark:border-ocab-200 dark:bg-ocab-200 dark:text-ocab-950"
                    : "hairline bg-[color:var(--surface)]"
                }`}
              >
                Dyr
              </button>
              <button
                type="button"
                onClick={() => setAnalyseType("ekskrementer")}
                disabled={analyserer}
                aria-pressed={analyseType === "ekskrementer"}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold shadow-flat transition disabled:opacity-50 ${
                  analyseType === "ekskrementer"
                    ? "border-ocab-900 bg-ocab-900 text-white dark:border-ocab-200 dark:bg-ocab-200 dark:text-ocab-950"
                    : "hairline bg-[color:var(--surface)]"
                }`}
              >
                Ekskrementer
              </button>
            </div>

            <label htmlFor="sted" className="mt-6 block text-sm font-semibold">
              Hvor fant du det?
            </label>
            <p className="mt-1 text-sm text-muted">
              Valgfritt, men det skiller arter som ser like ut – for eksempel
              skjeggkre inne og sølvkre på badet.
            </p>
            <select
              id="sted"
              value={sted}
              onChange={(e) => setSted(e.target.value)}
              disabled={analyserer}
              className="mt-3 w-full rounded-lg border hairline bg-[color:var(--surface)] px-4 py-3 text-base shadow-flat transition disabled:opacity-50"
            >
              <option value="">Ikke oppgitt</option>
              {LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>

            {analyseType === "dyr" ? (
              <>
                <label htmlFor="storrelse" className="mt-6 block text-sm font-semibold">
                  Omtrent hvor stort var det?
                </label>
                <p className="mt-1 text-sm text-muted">
                  Størrelse er det enkeltopplysningen som skiller flest arter fra
                  hverandre. Sammenlign gjerne med en fyrstikk eller en femkroning.
                </p>
                <select
                  id="storrelse"
                  value={storrelse}
                  onChange={(e) => setStorrelse(e.target.value)}
                  disabled={analyserer}
                  className="mt-3 w-full rounded-lg border hairline bg-[color:var(--surface)] px-4 py-3 text-base shadow-flat transition disabled:opacity-50"
                >
                  <option value="">Ikke oppgitt</option>
                  {SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>

                <label htmlFor="notesAnimal" className="mt-6 block text-sm font-semibold">
                  Notater om skadedyret
                </label>
                <p className="mt-1 text-sm text-muted">
                  Valgfritt. Skriv gjerne ned det du ellers ville sagt til en
                  skadedyrtekniker – atferd, lyd eller andre kjennetegn.
                </p>
                <textarea
                  id="notesAnimal"
                  value={notesAnimal}
                  onChange={(e) => setNotesAnimal(e.target.value.slice(0, 300))}
                  disabled={analyserer}
                  maxLength={300}
                  rows={6}
                  placeholder="F.eks. beveger seg raskt langs gulvlisten om kvelden, hørt skraping i veggen om natten, sett flere sammen."
                  className="mt-3 w-full resize-none rounded-lg border hairline bg-[color:var(--surface)] px-4 py-3 text-base shadow-flat transition disabled:opacity-50"
                />
                <p className="mt-1 text-right text-xs text-muted">
                  {notesAnimal.length}/300 tegn
                </p>
              </>
            ) : (
              <>
                <label htmlFor="beskrivelse" className="mt-6 block text-sm font-semibold">
                  Beskriv det du ser og lukter (viktigst!)
                </label>
                <p className="mt-1 text-sm text-muted">
                  Dette er den enkeltopplysningen som gir sikrest svar – viktigere
                  enn bildet alene. Skriv gjerne litt mer enn du tror er nødvendig.
                </p>
                <textarea
                  id="beskrivelse"
                  value={beskrivelse}
                  onChange={(e) => setBeskrivelse(e.target.value.slice(0, 300))}
                  disabled={analyserer}
                  maxLength={300}
                  rows={6}
                  placeholder={
                    "F.eks. smuldrer lett til pulver når jeg trykker på det, glinser litt, " +
                    "funnet i en haug rett under en sprekk på loftet. Eller: sterk, skarp " +
                    "lukt, ligger på en stein ved bekken, inneholder det som ser ut som " +
                    "fiskebein. Ta med lukt, konsistens (fast/smuldrer/glinsende), om det " +
                    "ligger spredt eller i haug/klynge, og nøyaktig hvor du fant det."
                  }
                  className="mt-3 w-full resize-none rounded-lg border hairline bg-[color:var(--surface)] px-4 py-3 text-base shadow-flat transition disabled:opacity-50"
                />
                <p className="mt-1 text-right text-xs text-muted">
                  {beskrivelse.length}/300 tegn
                </p>

                <label htmlFor="droppingSize" className="mt-6 block text-sm font-semibold">
                  Omtrentlig størrelse?
                </label>
                <select
                  id="droppingSize"
                  value={droppingSize}
                  onChange={(e) => setDroppingSize(e.target.value)}
                  disabled={analyserer}
                  className="mt-3 w-full rounded-lg border hairline bg-[color:var(--surface)] px-4 py-3 text-base shadow-flat transition disabled:opacity-50"
                >
                  <option value="">Ikke oppgitt</option>
                  {DROPPING_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              type="button"
              onClick={analyser}
              disabled={analyserer}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal-500 px-8 py-4 text-lg font-bold text-white shadow-raised transition hover:bg-signal-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              <Search className="size-5" aria-hidden />
              {analyserer ? "Analyserer bildet…" : "Artsbestem bildet"}
            </button>

            {analyserer && (
              <div className="mt-5">
                <div
                  className="sweep relative h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-sunken)]"
                  role="progressbar"
                  aria-valuenow={Math.round(fremdrift)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Analyserer bildet"
                >
                  <div
                    className="h-full rounded-full bg-ocab-900 transition-[width] duration-300 ease-out dark:bg-ocab-200"
                    style={{ width: `${fremdrift}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Sammenligner bildet med artslisten. Dette tar vanligvis noen sekunder.
                </p>
              </div>
            )}
          </div>
        )}

        <ResultDisplay result={result} onReset={nyttBilde} />

        {result && <AskAboutFinding key={result.name} result={result} />}

        {!file && <InstallBanner />}

        <HistoryPanel
          entries={historikk}
          onOpen={(e) => {
            setResult(e.resultat);
            setPreview(e.thumb || null);
            setFile(null);
          }}
          onRemove={(id) => setHistorikk(removeFromHistory(id))}
          onClear={() => setHistorikk(clearHistory())}
        />
      </main>

      <footer className="mt-14 border-t hairline pt-6 text-sm text-muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <OcabLogo height={20} />
            <p className="mt-2">Over 40 års erfaring med skadedyr</p>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <a
              href="https://www.ocab.no/skade/skadedyr/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ocab-700 underline underline-offset-4 dark:text-ocab-200"
            >
              Skadedyrtjenester fra Ocab
            </a>
            <p>© {new Date().getFullYear()} Ocab AS</p>
          </div>
        </div>
        <p className="mt-5 max-w-prose text-xs">
          Tjenesten er gratis og bruker bildeanalyse. Bildene lagres ikke hos oss
          etter at svaret er gitt. Svaret er veiledende og erstatter ikke en
          befaring.
        </p>
      </footer>
    </div>
  );
}
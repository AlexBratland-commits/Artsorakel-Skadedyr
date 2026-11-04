"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { nettverksfeil } from "@/lib/client-errors";
import { velgPlass, type BobleModus } from "@/lib/bobleplass";

/**
 * «Spør Artsorakel» – flytende chatboble for spørsmål om skadedyr uten bilde.
 * Helt adskilt fra funn-chatten (egen samtale, eget API, egen lagring).
 * Samtalen lagres bare i denne nettleseren og slettes med «Ny samtale».
 */

const OCAB_KONTAKT = "https://www.ocab.no/skade/skadedyr/";
const LAGRING = "artsorakel-assistent";
const TIDSGRENSE_MS = 35_000;

const FORSLAG = [
  "Jeg hører krafsing på loftet",
  "Hva kan lage hull i ullklær?",
  "Hvordan vet jeg om jeg har veggedyr?",
  "Hva er forskjellen på mus og rotte?",
  "Jeg finner maur på badet",
  "Hvordan sikrer jeg huset mot gnagere?",
];

interface Melding {
  role: "user" | "assistant";
  content: string;
  sig?: string;
  visKontakt?: boolean;
  visBilde?: boolean;
}

/** Fører brukeren til den vanlige bildeopplastingen på forsiden. */
function gaTilBildeanalyse() {
  const mal = document.getElementById("bildeopplasting");
  if (!mal) return;
  mal.scrollIntoView({ behavior: "smooth", block: "start" });
  mal.querySelector<HTMLElement>("button:not([disabled])")?.focus({ preventScroll: true });
}

interface Lagret {
  samtaleToken?: string;
  meldinger: Melding[];
}

function lesLagret(): Lagret {
  try {
    const raw = window.localStorage.getItem(LAGRING);
    if (!raw) return { meldinger: [] };
    const d = JSON.parse(raw);
    return Array.isArray(d?.meldinger) ? { samtaleToken: d.samtaleToken, meldinger: d.meldinger } : { meldinger: [] };
  } catch {
    return { meldinger: [] };
  }
}

export default function AssistantChat() {
  const [apen, setApen] = useState(false);
  const [meldinger, setMeldinger] = useState<Melding[]>([]);
  const [samtaleToken, setSamtaleToken] = useState<string | undefined>();
  const [utkast, setUtkast] = useState("");
  const [venter, setVenter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const knappRef = useRef<HTMLButtonElement>(null);
  // Boblen skal aldri dekke knapper eller skjemafelt: full → kompakt → skjult.
  const [modus, setModus] = useState<BobleModus>("full");
  const [synligModus, setSynligModus] = useState<"full" | "kompakt">("full");
  const [loft, setLoft] = useState(0);
  const fullStorrelse = useRef({ bredde: 190, hoyde: 52 });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lastet = useRef(false);

  // Hent tidligere samtale fra denne nettleseren (bare på klienten).
  useEffect(() => {
    const l = lesLagret();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMeldinger(l.meldinger);
    setSamtaleToken(l.samtaleToken);
    lastet.current = true;
  }, []);

  useEffect(() => {
    if (!lastet.current) return;
    try {
      if (meldinger.length) window.localStorage.setItem(LAGRING, JSON.stringify({ samtaleToken, meldinger }));
      else window.localStorage.removeItem(LAGRING);
    } catch {
      /* privat modus – samtalen lagres ikke */
    }
  }, [meldinger, samtaleToken]);

  useEffect(() => {
    listeRef.current?.scrollTo({ top: listeRef.current.scrollHeight, behavior: "smooth" });
  }, [meldinger, venter, apen]);

  const lukk = useCallback(() => {
    setApen(false);
    // Knappen vises igjen etter neste tegning – flytt fokuset dit da.
    requestAnimationFrame(() => knappRef.current?.focus());
  }, []);

  // Esc lukker, fokus til skrivefeltet når chatten åpnes, og siden bak låses på mobil.
  useEffect(() => {
    if (!apen) return;
    inputRef.current?.focus();
    const tast = (e: KeyboardEvent) => e.key === "Escape" && lukk();
    window.addEventListener("keydown", tast);
    const mobil = window.matchMedia("(max-width: 639px)").matches;
    if (mobil) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tast);
      document.body.style.overflow = "";
    };
  }, [apen, lukk]);

  // iPhone: tastaturet krymper ikke layout-viewporten, så et panel med
  // «inset: 0» havner delvis bak tastaturet. Følg den synlige delen av
  // skjermen i stedet, så skrivefeltet alltid er synlig.
  useEffect(() => {
    const vv = window.visualViewport;
    const panel = panelRef.current;
    if (!apen || !vv || !panel) return;
    const mobil = window.matchMedia("(max-width: 639px)");
    const tilpass = () => {
      if (!mobil.matches) {
        panel.style.height = "";
        panel.style.top = "";
        return;
      }
      panel.style.height = `${vv.height}px`;
      panel.style.top = `${vv.offsetTop}px`;
      listeRef.current?.scrollTo({ top: listeRef.current.scrollHeight });
    };
    tilpass();
    vv.addEventListener("resize", tilpass);
    vv.addEventListener("scroll", tilpass);
    return () => {
      vv.removeEventListener("resize", tilpass);
      vv.removeEventListener("scroll", tilpass);
      panel.style.height = "";
      panel.style.top = "";
    };
  }, [apen]);

  const analyserBilde = () => {
    setApen(false);
    // Vent til chatten er lukket og siden kan rulles igjen.
    requestAnimationFrame(() => requestAnimationFrame(gaTilBildeanalyse));
  };

  // Sjekk plassen ved scrolling, endret størrelse, tastatur og endret innhold.
  useEffect(() => {
    if (apen) return;
    let ramme = 0;
    const KOMPAKT = 52;
    const sjekk = () => {
      ramme = 0;
      const knapp = knappRef.current;
      if (!knapp) return;
      // Hjørnet boblen er festet til (uten løft), fra CSS-plasseringen – påvirkes ikke av animasjonen.
      const cs = getComputedStyle(knapp);
      const a = {
        right: document.documentElement.clientWidth - (parseFloat(cs.right) || 16),
        bottom: window.innerHeight - (parseFloat(cs.bottom) || 16),
      };
      if (knapp.dataset.modus === "full") {
        const r = knapp.getBoundingClientRect();
        if (r.width) fullStorrelse.current = { bredde: r.width, hoyde: r.height };
      }
      const { bredde, hoyde } = fullStorrelse.current;
      const plass = velgPlass(
        knapp,
        { left: a.right - bredde, top: a.bottom - hoyde, right: a.right, bottom: a.bottom },
        { left: a.right - KOMPAKT, top: a.bottom - KOMPAKT, right: a.right, bottom: a.bottom },
        // Løft boblen høyst til litt over midten av skjermen.
        Math.round(window.innerHeight * 0.45)
      );
      setModus(plass.modus);
      if (plass.modus !== "skjult") {
        setSynligModus(plass.modus);
        setLoft(plass.loft);
      }
    };
    const planlegg = () => {
      if (!ramme) ramme = requestAnimationFrame(sjekk);
    };
    const etterFokus = () => setTimeout(planlegg, 0);
    planlegg();
    window.addEventListener("scroll", planlegg, { passive: true, capture: true });
    window.addEventListener("resize", planlegg);
    window.visualViewport?.addEventListener("resize", planlegg);
    document.addEventListener("focusin", etterFokus);
    document.addEventListener("focusout", etterFokus);
    const ro = new ResizeObserver(planlegg);
    ro.observe(document.body);
    // Innhold kan endre seg uten at siden endrer størrelse (f.eks. en ny knapp).
    const intervall = window.setInterval(planlegg, 1000);
    return () => {
      cancelAnimationFrame(ramme);
      window.removeEventListener("scroll", planlegg, { capture: true });
      window.removeEventListener("resize", planlegg);
      window.visualViewport?.removeEventListener("resize", planlegg);
      document.removeEventListener("focusin", etterFokus);
      document.removeEventListener("focusout", etterFokus);
      ro.disconnect();
      window.clearInterval(intervall);
    };
  }, [apen]);

  const nySamtale = () => {
    setMeldinger([]);
    setSamtaleToken(undefined);
    setFeil(null);
    setUtkast("");
    inputRef.current?.focus();
  };

  const send = async (tekst: string) => {
    const sporsmal = tekst.trim();
    if (!sporsmal || venter) return;
    const neste: Melding[] = [...meldinger, { role: "user", content: sporsmal }];
    setMeldinger(neste);
    setUtkast("");
    setFeil(null);
    setVenter(true);
    const controller = new AbortController();
    const tid = window.setTimeout(() => controller.abort(), TIDSGRENSE_MS);
    try {
      const res = await fetch("/api/assistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          samtaleToken,
          messages: neste.map(({ role, content, sig, visKontakt, visBilde }) =>
            role === "assistant" ? { role, content, sig, kontakt: !!visKontakt, bilde: !!visBilde } : { role, content }
          ),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401 && data?.kode === "tilgang_kreves") {
        throw new Error("Logg inn med tilgangskoden på forsiden først.");
      }
      if (data?.kode === "samtale_ugyldig") {
        setMeldinger([{ role: "user", content: sporsmal }]);
        setSamtaleToken(undefined);
        throw new Error("Samtalen måtte startes på nytt. Send spørsmålet igjen.");
      }
      if (!res.ok) throw new Error(data?.error ?? "Fikk ikke svar. Prøv igjen.");
      if (typeof data?.svar !== "string" || !data.svar) throw new Error("Tomt svar. Prøv igjen.");
      setSamtaleToken(data.samtaleToken);
      setMeldinger([
        ...neste,
        {
          role: "assistant",
          content: data.svar,
          sig: data.signatur,
          visKontakt: !!data.visKontakt,
          visBilde: !!data.visBilde,
        },
      ]);
    } catch (error) {
      setMeldinger((m) => (m.at(-1)?.role === "user" && m.at(-1)?.content === sporsmal ? m.slice(0, -1) : m));
      setUtkast(sporsmal);
      setFeil(nettverksfeil(error, "Fikk ikke svar. Prøv igjen."));
    } finally {
      window.clearTimeout(tid);
      setVenter(false);
    }
  };

  return (
    <>
      {!apen && (
        <button
          ref={knappRef}
          type="button"
          onClick={() => setApen(true)}
          aria-expanded={false}
          aria-controls="assistent-panel"
          data-modus={modus}
          data-loft={loft}
          style={loft ? { transform: `translateY(-${loft}px)` } : undefined}
          data-flytende=""
          title={synligModus === "kompakt" ? "Spør Artsorakel" : undefined}
          className={`no-print fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center justify-center rounded-full bg-ocab-900 text-sm font-semibold text-white shadow-lifted ring-1 ring-white/10 transition-[opacity,transform,background-color] duration-200 hover:bg-ocab-950 active:scale-[0.98] motion-reduce:transition-none dark:bg-ocab-200 dark:text-ocab-950 dark:hover:bg-white ${
            synligModus === "full" ? "gap-2 px-5 py-3.5" : "size-[52px]"
          } ${
            modus === "skjult"
              ? "pointer-events-none translate-y-3 opacity-0 focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100"
              : ""
          }`}
        >
          <MessageCircle className="size-5 shrink-0" aria-hidden />
          <span className={synligModus === "full" ? "" : "sr-only"}>Spør Artsorakel</span>
        </button>
      )}

      {apen && (
        <section
          id="assistent-panel"
          ref={panelRef}
          role="dialog"
          aria-labelledby="assistent-tittel"
          className="no-print fixed inset-0 z-50 flex flex-col bg-[color:var(--surface)] sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(640px,calc(100dvh-2rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-card sm:border sm:hairline sm:shadow-lifted"
        >
          <header className="flex items-center gap-2 bg-ocab-900 py-1.5 pl-4 pr-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] text-white sm:gap-3 sm:py-3 sm:pr-2 dark:bg-ocab-950">
            <MessageCircle className="hidden size-5 shrink-0 text-ocab-200 sm:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 id="assistent-tittel" className="text-base font-semibold leading-tight">
                Spør Artsorakel
              </h2>
              <p className="hidden text-xs text-ocab-200 sm:block">Fagassistent for skadedyr</p>
            </div>
            <button
              type="button"
              onClick={nySamtale}
              disabled={venter}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Ny samtale
            </button>
            <button
              type="button"
              onClick={lukk}
              aria-label="Lukk chatten"
              className="grid size-10 place-items-center rounded-full transition hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={listeRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-[color:var(--surface-sunken)] px-4 py-2.5 text-sm leading-relaxed">
              Hei! Jeg er Artsorakels fagassistent. Beskriv hva du har sett eller hørt – for eksempel
              størrelse, farge, lyd og hvor du fant det – så hjelper jeg deg videre. Har du et bilde,
              gir bildeanalysen på forsiden et sikrere svar.
            </p>

            {meldinger.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {FORSLAG.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => send(f)}
                    className="rounded-full border border-ocab-900/20 px-3.5 py-2 text-left text-sm transition hover:bg-ocab-50 dark:border-white/15 dark:hover:bg-white/5"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            {meldinger.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <p
                  className={`w-fit max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-ocab-900 text-white dark:bg-ocab-700"
                      : "rounded-bl-sm bg-[color:var(--surface-sunken)]"
                  }`}
                >
                  {m.content}
                </p>
                {m.visBilde && (
                  <button
                    type="button"
                    onClick={analyserBilde}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ocab-900/20 px-3.5 py-2 text-sm font-semibold text-ocab-900 transition hover:bg-ocab-50 dark:border-white/15 dark:text-ocab-200 dark:hover:bg-white/5"
                  >
                    <Camera className="size-4" aria-hidden />
                    Analyser bilde
                  </button>
                )}
                {m.visKontakt && (
                  <div className="mt-2 max-w-[88%] rounded-xl border border-ocab-500/30 bg-ocab-50 p-4 text-sm dark:border-ocab-200/20 dark:bg-ocab-900/30">
                    <p className="leading-relaxed">
                      Dette kan være lurt å få undersøkt nærmere. Ocab kan hjelpe deg med å kartlegge
                      problemet og vurdere riktige tiltak.
                    </p>
                    <a
                      href={OCAB_KONTAKT}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#b34a00] px-4 py-2 font-semibold text-white transition hover:bg-[#963e00]"
                    >
                      Kontakt Ocab
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </div>
                )}
              </div>
            ))}

            {venter && (
              <p className="w-fit rounded-2xl rounded-bl-sm bg-[color:var(--surface-sunken)] px-4 py-2.5 text-sm text-muted">
                Skriver …
              </p>
            )}
            {feil && (
              <p role="alert" className="rounded-lg border-l-2 border-grad-hoy bg-[color:var(--surface-sunken)] px-3 py-2 text-sm">
                {feil}
              </p>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t hairline p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(utkast);
            }}
          >
            <label htmlFor="assistent-input" className="sr-only">
              Skriv spørsmålet ditt til Artsorakel
            </label>
            <textarea
              id="assistent-input"
              ref={inputRef}
              rows={1}
              value={utkast}
              maxLength={500}
              onChange={(e) => setUtkast(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(utkast);
                }
              }}
              disabled={venter}
              placeholder="Beskriv hva du har funnet …"
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl bg-[color:var(--surface-sunken)] px-4 py-2.5 text-base outline-none disabled:opacity-50 sm:text-sm"
            />
            <button
              type="submit"
              disabled={venter || !utkast.trim()}
              aria-label="Send spørsmål til Artsorakel"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-ocab-900 text-white transition hover:bg-ocab-950 disabled:opacity-40 dark:bg-ocab-200 dark:text-ocab-950"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </form>

          <footer className="flex items-center justify-between gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-xs leading-snug text-muted sm:border-t sm:hairline sm:pt-2.5 sm:leading-relaxed">
            {/* Kort på mobil, full tekst på PC. Begge viser til personvernsiden. */}
            <p className="sm:hidden">
              Sendes til AI. Ikke skriv personopplysninger.{" "}
              <Link href="/personvern" className="underline underline-offset-2">
                Personvern
              </Link>
            </p>
            <p className="hidden max-w-[17rem] sm:block">
              Meldinger sendes til en AI-tjeneste. Ikke skriv navn, adresse eller andre
              personopplysninger. Samtalen lagres bare i denne nettleseren.{" "}
              <Link href="/personvern" className="underline underline-offset-2">
                Personvern
              </Link>
            </p>
            <a
              href={OCAB_KONTAKT}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-medium text-ocab-700 underline underline-offset-4 dark:text-ocab-200"
            >
              Kontakt Ocab
            </a>
          </footer>
        </section>
      )}
    </>
  );
}

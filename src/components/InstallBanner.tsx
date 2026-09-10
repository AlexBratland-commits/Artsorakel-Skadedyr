"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ocab-install-avvist";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosTips, setIosTips] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline-støtte er en bonus, ikke et krav */
      });
    }

    let avvist = false;
    try {
      avvist = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* ignorer */
    }
    if (avvist) return;

    const alleredeInstallert =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (alleredeInstallert) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS støtter ikke beforeinstallprompt – der viser vi en kort instruksjon.
    const erIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const erSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    // navigator er kun tilgjengelig på klienten – leses derfor etter mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (erIos && erSafari) setIosTips(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const lukk = () => {
    setPrompt(null);
    setIosTips(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignorer */
    }
  };

  const installer = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    lukk();
  };

  if (!prompt && !iosTips) return null;

  return (
    <div className="no-print mt-6 flex items-start gap-3 rounded-card border border-ocab-900/15 bg-[color:var(--surface)]/80 px-4 py-3 text-sm shadow-flat dark:border-white/10">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Legg appen på hjemskjermen</p>
        {iosTips ? (
          <p className="mt-1 text-muted">
            Trykk på <Share className="inline size-4 align-text-bottom" aria-hidden /> i
            Safari og velg «Legg til på Hjem-skjerm». Da har du kameraet og
            artsbestemmeren ett trykk unna.
          </p>
        ) : (
          <p className="mt-1 text-muted">
            Da åpner den seg som en vanlig app, med kameraet ett trykk unna.
          </p>
        )}
      </div>

      {prompt && (
        <button
          type="button"
          onClick={installer}
          className="shrink-0 rounded-full bg-ocab-900 px-4 py-2 font-semibold text-white transition hover:bg-ocab-950"
        >
          Legg til
        </button>
      )}
      <button
        type="button"
        onClick={lukk}
        aria-label="Skjul dette"
        className="-m-1 shrink-0 rounded p-1 text-muted"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
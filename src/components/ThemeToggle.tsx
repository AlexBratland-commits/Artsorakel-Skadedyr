"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const DARK_CLASS = "dark";

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains(DARK_CLASS);
}

function getServerSnapshot(): boolean {
  return false;
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const bytt = () => {
    const neste = !dark;
    document.documentElement.classList.toggle(DARK_CLASS, neste);
    try {
      localStorage.setItem("ocab-tema", neste ? "dark" : "light");
    } catch {
      /* privat modus – la det gå */
    }
  };

  return (
    <button
      type="button"
      onClick={bytt}
      aria-pressed={dark}
      aria-label={dark ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      className="no-print grid size-10 place-items-center rounded-full surface text-ocab-900 shadow-flat transition hover:shadow-raised dark:text-ocab-200"
    >
      {dark ? (
        <Sun className="size-5" aria-hidden />
      ) : (
        <Moon className="size-5" aria-hidden />
      )}
    </button>
  );
}
"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { nettverksfeil } from "@/lib/client-errors";

/**
 * Skjema for tilgangskode. Vises bare når serveren krever kode
 * (ARTSORAKEL_TILGANGSKODE er satt) og denne enheten ikke er logget inn.
 */
export default function AccessGate({ onOk }: { onOk: () => void }) {
  const [kode, setKode] = useState("");
  const [venter, setVenter] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode.trim() || venter) return;
    setVenter(true);
    setFeil(null);
    try {
      const res = await fetch("/api/tilgang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Kunne ikke logge inn. Prøv igjen.");
      setKode("");
      onOk();
    } catch (error) {
      setFeil(nettverksfeil(error, "Kunne ikke logge inn. Prøv igjen."));
    } finally {
      setVenter(false);
    }
  };

  return (
    <form
      onSubmit={send}
      className="rounded-card surface p-6 shadow-raised sm:p-8"
      aria-labelledby="tilgang-tittel"
    >
      <KeyRound className="size-8 text-ocab-500" aria-hidden />
      <h2 id="tilgang-tittel" className="mt-3 text-lg font-semibold">
        Artsorakel er for ansatte i Ocab
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Skriv inn tilgangskoden du har fått. Du trenger bare å gjøre det én gang på denne
        enheten.
      </p>

      <label htmlFor="tilgangskode" className="mt-5 block text-sm font-semibold">
        Tilgangskode
      </label>
      <input
        id="tilgangskode"
        type="password"
        autoComplete="current-password"
        value={kode}
        onChange={(e) => setKode(e.target.value.slice(0, 200))}
        disabled={venter}
        aria-invalid={feil ? true : undefined}
        aria-describedby={feil ? "tilgang-feil" : undefined}
        className="mt-2 w-full rounded-lg border hairline bg-[color:var(--surface)] px-4 py-3 text-base shadow-flat disabled:opacity-50"
      />
      {feil && (
        <p id="tilgang-feil" role="alert" className="mt-2 text-sm font-medium text-grad-hoy">
          {feil}
        </p>
      )}

      <button
        type="submit"
        disabled={venter || !kode.trim()}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ocab-900 px-6 py-3 font-semibold text-white shadow-raised transition hover:bg-ocab-950 disabled:opacity-50 sm:w-auto"
      >
        {venter ? "Sjekker …" : "Logg inn"}
      </button>
    </form>
  );
}

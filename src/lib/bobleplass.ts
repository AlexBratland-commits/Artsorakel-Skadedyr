/**
 * Plassering av den flytende chatboblen: den skal aldri ligge over knapper,
 * lenker eller skjemafelt. Virker på alle sider, fordi den sjekker hva som
 * faktisk ligger under boblen i stedet for å kjenne til bestemte knapper.
 *
 * Rekkefølge: full boble → kompakt (bare ikon) → skjult til plassen er fri.
 * Mens tastaturet er åpent (et skrivefelt har fokus) skjules boblen også,
 * siden den da ellers kan legge seg over feltet på mobil.
 */

export type BobleModus = "full" | "kompakt" | "skjult";

/** Elementer boblen ikke får dekke. */
const VIKTIG =
  'button, a[href], input, select, textarea, label, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [contenteditable="true"]';

/** Andre flytende lag (varsler o.l.) som ikke teller som innhold. */
const FLYTENDE = "[data-flytende]";

const SKRIVEFELT = 'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select, [contenteditable="true"]';

export interface Ramme {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Dekker en ramme (med litt luft) noe viktig? Selve boblen og andre flytende lag hoppes over. */
export function dekkerViktig(ramme: Ramme, boble: Element | null, luft = 6): boolean {
  const r = { left: ramme.left - luft, top: ramme.top - luft, right: ramme.right + luft, bottom: ramme.bottom + luft };
  // Tett rutenett (høyst ca. 12 px mellom punktene), så også små overlapp i hjørnene fanges opp.
  const punkter = (fra: number, til: number) => {
    const n = Math.max(2, Math.ceil((til - fra) / 12));
    return Array.from({ length: n + 1 }, (_, i) => fra + ((til - fra) * i) / n);
  };
  const xs = punkter(r.left, r.right);
  const ys = punkter(r.top, r.bottom);
  for (const x of xs) {
    for (const y of ys) {
      if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
      for (const el of document.elementsFromPoint(x, y)) {
        if (boble?.contains(el) || el.closest(FLYTENDE)) continue;
        // Det øverste innholdet i dette punktet: er det (inne i) noe viktig?
        if (el.closest(VIKTIG)) return true;
        break;
      }
    }
  }
  return false;
}

export function tastaturApent(boble: Element | null): boolean {
  const aktiv = document.activeElement;
  return !!aktiv && !boble?.contains(aktiv) && aktiv.matches(SKRIVEFELT) && window.matchMedia("(pointer: coarse)").matches;
}

export interface BoblePlass {
  modus: BobleModus;
  /** Hvor mange piksler boblen løftes opp fra hjørnet for å finne ledig plass. */
  loft: number;
}

const flytt = (r: Ramme, dy: number): Ramme => ({ ...r, top: r.top - dy, bottom: r.bottom - dy });

/**
 * Velger plass. `full` og `kompakt` er rammene boblen ville fått i hjørnet
 * nede til høyre, så valget gjøres uten å flytte boblen først.
 * Rekkefølge: full i hjørnet → kompakt i hjørnet → kompakt løftet opp til
 * nærmeste ledige plass (høyst `maksLoft`) → skjult.
 */
export function velgPlass(boble: Element | null, full: Ramme, kompakt: Ramme, maksLoft: number): BoblePlass {
  if (tastaturApent(boble)) return { modus: "skjult", loft: 0 };
  if (!dekkerViktig(full, boble)) return { modus: "full", loft: 0 };
  if (!dekkerViktig(kompakt, boble)) return { modus: "kompakt", loft: 0 };
  for (let loft = 8; loft <= maksLoft; loft += 8) {
    if (!dekkerViktig(flytt(kompakt, loft), boble)) return { modus: "kompakt", loft };
  }
  return { modus: "skjult", loft: 0 };
}

/** Kort form uten løft (brukt der bare modus trengs). */
export function velgModus(boble: Element | null, full: Ramme, kompakt: Ramme): BobleModus {
  return velgPlass(boble, full, kompakt, 0).modus;
}

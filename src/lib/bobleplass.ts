/**
 * Plassering av den flytende chatboblen: den skal aldri ligge over knapper,
 * lenker eller skjemafelt. Virker på alle sider, fordi den sammenligner med
 * alle synlige knapper og felt i stedet for å kjenne til bestemte knapper.
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

/**
 * Rammene til synlige viktige elementer i skjermbildet (L2, revisjon).
 * Hentes én gang per sjekk, så alle kandidatplasser kan prøves billig.
 * Tidligere ble det gjort tusenvis av punktsøk per sjekk, som ga hakking
 * på enkle mobiler. Elementer under et annet lag regnes med – det gjør at
 * boblen heller viker for ofte enn for sjelden.
 */
export function viktigeRammer(boble: Element | null): Ramme[] {
  const bredde = window.innerWidth;
  const hoyde = window.innerHeight;
  const rammer: Ramme[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(VIKTIG)) {
    if (boble?.contains(el) || el.closest(FLYTENDE)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > hoyde || r.right < 0 || r.left > bredde) continue;
    if (getComputedStyle(el).visibility === "hidden") continue;
    rammer.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  return rammer;
}

/** Overlapper rammen (med litt luft) noen av de viktige elementene? */
export function dekkerViktig(ramme: Ramme, viktige: Ramme[], luft = 6): boolean {
  const r = { left: ramme.left - luft, top: ramme.top - luft, right: ramme.right + luft, bottom: ramme.bottom + luft };
  return viktige.some((v) => v.left < r.right && v.right > r.left && v.top < r.bottom && v.bottom > r.top);
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
  const viktige = viktigeRammer(boble);
  if (!dekkerViktig(full, viktige)) return { modus: "full", loft: 0 };
  if (!dekkerViktig(kompakt, viktige)) return { modus: "kompakt", loft: 0 };
  for (let loft = 8; loft <= maksLoft; loft += 8) {
    if (!dekkerViktig(flytt(kompakt, loft), viktige)) return { modus: "kompakt", loft };
  }
  return { modus: "skjult", loft: 0 };
}

/** Kort form uten løft (brukt der bare modus trengs). */
export function velgModus(boble: Element | null, full: Ramme, kompakt: Ramme): BobleModus {
  return velgPlass(boble, full, kompakt, 0).modus;
}

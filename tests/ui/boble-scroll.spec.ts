/**
 * Chatboblen «Spør Artsorakel» på mobil (iPhone SE og iPhone 13):
 * alltid synlig, rund 52 × 52 px med chatikon, fast nede til høyre med
 * safe-area – den skjules, tones ut, flyttes eller endrer størrelse aldri,
 * verken under scrolling eller over andre knapper. Knapper bak boblen nås
 * fordi siden har luft nederst.
 * Chromium med iPhone-mål; dette er ikke det samme som Safari på iPhone.
 */
import { expect, test, type Page } from "@playwright/test";
import { slettFil, testbilde } from "./helpers";

const BOBLE = 'button[aria-controls="assistent-panel"]';

/** Scroll jevnt som med fingeren og mål boblen i hver animasjonsramme. */
async function scrollOgMal(page: Page, fra: number, til: number, steg = 20) {
  return page.evaluate(
    ([a, b, s, sel]) =>
      new Promise<string[]>((ferdig) => {
        const maalinger = new Set<string>();
        const mal = () => {
          const el = document.querySelector<HTMLElement>(sel as string)!;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          maalinger.add(
            [
              Math.round(r.width), Math.round(r.height),
              Math.round(window.innerWidth - r.right), Math.round(window.innerHeight - r.bottom),
              cs.opacity, cs.visibility, cs.display, el.dataset.modus, el.style.transform || "-",
            ].join("|")
          );
        };
        let y = a as number;
        const retning = Math.sign((b as number) - (a as number)) || 1;
        window.scrollTo(0, y);
        const neste = () => {
          mal();
          y += retning * (s as number);
          if ((retning > 0 && y >= (b as number)) || (retning < 0 && y <= (b as number))) {
            window.scrollTo(0, b as number);
            requestAnimationFrame(() => {
              mal();
              // Litt etter at scrollingen stopper – boblen skal heller ikke endre seg da
              setTimeout(() => {
                mal();
                ferdig([...maalinger]);
              }, 600);
            });
            return;
          }
          window.scrollTo(0, y);
          requestAnimationFrame(neste);
        };
        requestAnimationFrame(neste);
      }),
    [fra, til, steg, BOBLE] as const
  );
}

const bunn = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

function forventStabil(maalinger: string[]) {
  // Én eneste tilstand gjennom hele scrollingen: 52 × 52, samme plass, synlig, kompakt, ingen løft
  expect(maalinger).toHaveLength(1);
  const [bredde, hoyde, hoyre, nederst, opacity, visibility, display, modus, transform] = maalinger[0].split("|");
  expect([bredde, hoyde]).toEqual(["52", "52"]);
  expect(Number(hoyre)).toBeGreaterThanOrEqual(16);
  expect(Number(nederst)).toBeGreaterThanOrEqual(16);
  expect([opacity, visibility, modus, transform]).toEqual(["1", "visible", "kompakt", "-"]);
  expect(display).not.toBe("none");
}

/** Kan alle knapper, lenker og felt nås og trykkes på (ikke bak boblen) i en eller annen scrollposisjon? */
async function alleKanNas(page: Page) {
  return page.evaluate(async (sel) => {
    const boble = document.querySelector<HTMLElement>(sel)!;
    const elementer = [...document.querySelectorAll<HTMLElement>('button, a[href], input:not([type="file"]), select, textarea, summary, [role="button"]')].filter(
      (el) =>
        el !== boble &&
        !boble.contains(el) &&
        el.offsetParent !== null &&
        !el.closest("[data-flytende]") &&
        // Skjult til den får fokus (f.eks. «Hopp til innholdet») – nås med Tab, ikke med fingeren
        !el.classList.contains("sr-only")
    );
    const utilgjengelige: string[] = [];
    for (const el of elementer) {
      let ok = false;
      for (const block of ["center", "start", "end"] as const) {
        el.scrollIntoView({ block });
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1);
        const y = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1);
        const treff = document.elementFromPoint(x, y);
        if (treff && (treff === el || el.contains(treff) || treff.closest("label")?.contains(el))) {
          ok = true;
          break;
        }
      }
      if (!ok) utilgjengelige.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40));
    }
    return utilgjengelige;
  }, BOBLE);
}

test("forsiden med valgt bilde: boblen er uendret gjennom hele scrollingen – fra bildeopplasting til bunnteksten", async ({ page }) => {
  const bilde = await testbilde(161);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await expect(page.getByRole("button", { name: "Artsbestem bildet" })).toBeVisible();
  slettFil(bilde);
  const b = await bunn(page);
  forventStabil(await scrollOgMal(page, 0, b));
  forventStabil(await scrollOgMal(page, b, 0));
  // Små bevegelser fram og tilbake midt på siden (der bildeopplastingen ligger)
  const midt = Math.round(b / 2);
  forventStabil(await scrollOgMal(page, midt, midt + 8, 2));
  forventStabil(await scrollOgMal(page, midt + 8, midt, 2));
});

test("resultatsiden: boblen er uendret gjennom hele scrollingen, også når tastaturet er åpent", async ({ page }) => {
  const bilde = await testbilde(162);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);
  const b = await bunn(page);
  forventStabil(await scrollOgMal(page, 0, b));
  forventStabil(await scrollOgMal(page, b, 0));
  // Skrivefelt med fokus (tastatur på mobil): boblen skjules ikke
  await page.getByLabel("Skriv spørsmålet ditt", { exact: true }).focus();
  forventStabil(await scrollOgMal(page, await page.evaluate(() => window.scrollY), b));
});

test("bunnteksten: ingen knapp eller lenke ligger bak boblen når man har scrollet helt ned", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const dekket = await page.evaluate((sel) => {
    const b = document.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, summary")]
      .filter((el) => !el.closest("[data-flytende]") && el.offsetParent !== null)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
      })
      .map((el) => el.textContent?.trim().slice(0, 30));
  }, BOBLE);
  expect(dekket).toEqual([]);
  await expect(page.getByRole("link", { name: "Personvern" })).toBeInViewport();
});

test("alle knapper, lenker og felt kan nås og trykkes på – forsiden med bilde og resultatsiden", async ({ page }) => {
  const bilde = await testbilde(163);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await expect(page.getByRole("button", { name: "Artsbestem bildet" })).toBeVisible();
  expect(await alleKanNas(page)).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);
  expect(await alleKanNas(page)).toEqual([]);
});

test("tastatur og skjermleser: boblen har navn, nås med Tab og åpner chatten", async ({ page }) => {
  await page.goto("/");
  const boble = page.getByRole("button", { name: "Spør Artsorakel" });
  await expect(boble).toHaveAttribute("title", "Spør Artsorakel");
  await boble.focus();
  await expect(boble).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(boble).toBeFocused();
});

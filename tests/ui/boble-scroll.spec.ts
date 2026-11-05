/**
 * Chatboblen «Spør Artsorakel» under scrolling (iPhone SE og iPhone 13).
 * Boblen skal ikke bytte mellom stor og liten eller hoppe opp og ned mens
 * brukeren scroller – plassen vurderes når scrollingen har stoppet. Den
 * skal fortsatt aldri ligge over knapper når siden står stille.
 * Chromium med iPhone-mål; dette er ikke det samme som Safari på iPhone.
 */
import { expect, test, type Page } from "@playwright/test";
import { slettFil, testbilde } from "./helpers";

async function analyser(page: Page, seed: number) {
  const bilde = await testbilde(seed);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);
}

/** Begynn å telle endringer i boblens størrelse og plass (modus, løft, synlighet). */
async function startTelling(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __endringer: string[] };
    w.__endringer = [];
    const boble = document.querySelector<HTMLElement>('button[aria-controls="assistent-panel"]')!;
    new MutationObserver((m) => {
      for (const e of m) w.__endringer.push(`${e.attributeName}=${boble.getAttribute(e.attributeName!)}`);
    }).observe(boble, { attributes: true, attributeFilter: ["data-modus", "data-loft", "style"] });
  });
}
const endringer = (page: Page) => page.evaluate(() => (window as unknown as { __endringer: string[] }).__endringer.splice(0));

/** Jevn scrolling som med fingeren: små steg hver animasjonsramme. */
async function scrollJevnt(page: Page, fra: number, til: number, steg = 24) {
  await page.evaluate(
    ([a, b, s]) =>
      new Promise<void>((ferdig) => {
        let y = a;
        const retning = Math.sign(b - a);
        const neste = () => {
          y += retning * s;
          if ((retning > 0 && y >= b) || (retning < 0 && y <= b)) {
            window.scrollTo(0, b);
            return ferdig();
          }
          window.scrollTo(0, y);
          requestAnimationFrame(neste);
        };
        window.scrollTo(0, a);
        requestAnimationFrame(neste);
      }),
    [fra, til, steg]
  );
}

test("boblen bytter ikke størrelse eller plass mens man scroller – bare når scrollingen stopper", async ({ page }) => {
  await analyser(page, 151);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await startTelling(page);
  const bunn = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);

  await scrollJevnt(page, 0, bunn);
  await scrollJevnt(page, bunn, 0);
  await scrollJevnt(page, 0, bunn);
  expect(await endringer(page), "endringer under scrolling").toEqual([]);

  // Når scrollingen har stoppet, får boblen sin plass – én gang, ikke fram og tilbake.
  await page.waitForTimeout(600);
  expect((await endringer(page)).length).toBeLessThanOrEqual(3);
  await page.waitForTimeout(1200);
  expect(await endringer(page), "rolig når siden står stille").toEqual([]);
});

test("små scrollbevegelser gir ingen endringer", async ({ page }) => {
  await analyser(page, 152);
  const midt = await page.evaluate(() => Math.round((document.documentElement.scrollHeight - window.innerHeight) / 2));
  await page.evaluate((y) => window.scrollTo(0, y), midt);
  await page.waitForTimeout(600);
  await startTelling(page);
  for (let i = 0; i < 10; i++) {
    await scrollJevnt(page, midt, midt + 6, 2);
    await scrollJevnt(page, midt + 6, midt, 2);
  }
  await page.waitForTimeout(600);
  const e = await endringer(page);
  // Samme sted hver gang: høyst én justering etter at bevegelsen stopper
  expect(e.length).toBeLessThanOrEqual(2);
});

test("boblen ligger fast i hjørnet nede til høyre, innenfor safe-area, og dekker ingen knapper når siden står stille", async ({ page }) => {
  await analyser(page, 153);
  const bunn = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const y of [0, Math.round(bunn / 3), Math.round((2 * bunn) / 3), bunn]) {
    await scrollJevnt(page, await page.evaluate(() => window.scrollY), y);
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const b = document.querySelector<HTMLElement>('button[aria-controls="assistent-panel"]')!;
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      const viktige = [...document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, label, summary')].filter(
        (el) => el !== b && !el.closest("[data-flytende]") && el.offsetParent !== null
      );
      const dekket = b.dataset.modus === "skjult" || cs.opacity === "0" ? [] : viktige.filter((el) => {
        const v = el.getBoundingClientRect();
        return v.width && v.height && v.left < r.right && v.right > r.left && v.top < r.bottom && v.bottom > r.top;
      }).map((el) => el.textContent?.trim().slice(0, 30));
      return { hoyreAvstand: window.innerWidth - r.right, posisjon: cs.position, dekket };
    });
    expect(info.posisjon).toBe("fixed");
    expect(info.hoyreAvstand).toBeGreaterThanOrEqual(15);
    expect(info.dekket, `scroll ${y}`).toEqual([]);
  }
});

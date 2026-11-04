/**
 * Chatboblen dekker aldri knapper eller skjemafelt (iPhone SE og iPhone 13,
 * lys og mørk modus), og PDF-rapporten kan lastes ned etter en analyse.
 * Falsk AI – ingen ekte AI-kall.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

const VIKTIG = 'button, a[href], input, select, textarea, label, summary, [role="button"]';

/** Finn viktige elementer som overlapper den synlige boblen. */
async function dekkedeElementer(page: Page): Promise<string[]> {
  return page.evaluate((viktig) => {
    const boble = document.querySelector<HTMLElement>('button[aria-controls="assistent-panel"]');
    if (!boble || boble.dataset.modus === "skjult" || getComputedStyle(boble).opacity === "0") return [];
    const b = boble.getBoundingClientRect();
    const funn: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(viktig)) {
      if (el === boble || boble.contains(el) || el.closest("[data-flytende]")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || el.offsetParent === null) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const overlapp = r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
      if (overlapp) funn.push((el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40));
    }
    return funn;
  }, VIKTIG);
}

/** Scroll gjennom hele siden og sjekk boblen i hvert steg. */
async function sjekkHeleSiden(page: Page) {
  const hoyde = await page.evaluate(() => document.documentElement.scrollHeight);
  const vindu = page.viewportSize()!.height;
  for (let y = 0; y <= hoyde; y += Math.round(vindu / 3)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    // Vent til boblen har sjekket plassen (neste animasjonsramme) og eventuelt tonet ut.
    await expect.poll(() => dekkedeElementer(page), { message: `scroll ${y}`, timeout: 1500 }).toEqual([]);
  }
}

for (const tema of ["light", "dark"] as const) {
  test(`chatboblen dekker ingen knapper på forsiden (${tema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/");
    await page.waitForTimeout(300);
    expect(await dekkedeElementer(page)).toEqual([]);
    await expect(page.getByRole("button", { name: "Velg fra bilder" })).toBeVisible();
    await sjekkHeleSiden(page);
    // Boblen kommer tilbake der det er plass, og kan åpnes
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const boble = page.getByRole("button", { name: "Spør Artsorakel" });
    await expect(boble).not.toHaveAttribute("data-modus", "skjult");
    await boble.click();
    await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toBeVisible();
  });
}

test("med åpent tastatur skjules boblen, og den kommer tilbake etterpå", async ({ page }) => {
  const bilde = await testbilde(61);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.locator("#notesAnimal").focus();
  const boble = page.getByRole("button", { name: "Spør Artsorakel" });
  await expect(boble).toHaveAttribute("data-modus", "skjult");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(boble).not.toHaveAttribute("data-modus", "skjult");
  slettFil(bilde);
});

test("PDF-rapport etter analyse: knappen er synlig og ikke dekket, og PDF-en har riktig innhold", async ({ page }) => {
  const bilde = await testbilde(62);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();

  const knapp = page.getByRole("button", { name: "Last ned PDF-rapport" });
  await knapp.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(await dekkedeElementer(page)).toEqual([]);
  await sjekkHeleSiden(page);

  await knapp.scrollIntoViewIfNeeded();
  const [nedlasting] = await Promise.all([page.waitForEvent("download"), knapp.click()]);
  expect(nedlasting.suggestedFilename()).toMatch(/^artsorakel-rapport-\d{4}-\d{2}-\d{2}-husmus\.pdf$/);
  const sti = await nedlasting.path();
  const bytes = new Uint8Array(fs.readFileSync(sti!));
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  // Bildet er med (som JPEG-bilde i PDF-en)
  expect(Buffer.from(bytes).toString("latin1")).toMatch(/\/Subtype \/Image[\s\S]*\/Filter \/DCTDecode|\/Filter \/DCTDecode[\s\S]*\/Subtype \/Image/);
  const tekst = (await pdfTekst(bytes)).join("\n");
  expect(tekst).toContain("Artsorakel – analyserapport");
  expect(tekst).toContain("Husmus");
  expect(tekst).toContain("Mus musculus");
  expect(tekst).toContain("Bør følges opp");
  expect(tekst.replace(/\n/g, " ")).toContain(
    "Rapporten er generert ved hjelp av kunstig intelligens basert på innsendt bilde og tilgjengelige opplysninger. Resultatet er veiledende og erstatter ikke en faglig vurdering på stedet."
  );
  await expect(page.getByText("PDF-rapporten er laget.")).toBeVisible();
  slettFil(bilde);
});

test("PDF fra historikken bruker miniatyrbildet og merker det", async ({ page }) => {
  const bilde = await testbilde(63);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  await page.reload();
  await page.getByRole("region", { name: "Tidligere bilder på denne enheten" }).getByRole("button", { name: /Husmus/ }).first().click();
  const [nedlasting] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Last ned PDF-rapport" }).click(),
  ]);
  const tekst = (await pdfTekst(new Uint8Array(fs.readFileSync((await nedlasting.path())!)))).join(" ").replace(/\n/g, " ");
  expect(tekst).toContain("Miniatyrbilde fra historikken");
  slettFil(bilde);
});

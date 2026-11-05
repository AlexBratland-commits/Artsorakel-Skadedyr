/**
 * Nedlastingsdialogen og valgfri samtale i PDF-rapporten (iPhone SE,
 * iPhone 13 og PC). Falsk AI – ingen ekte AI-kall.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

const FORBEHOLD =
  "Dette vedlegget inneholder en AI-generert samtale. Svarene er veiledende og kan inneholde feil eller usikkerheter. Samtalen er ikke en bekreftet faglig vurdering fra Ocab.";

async function analyser(page: Page, seed: number, notater?: string) {
  const bilde = await testbilde(seed);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  if (notater) await page.locator("#notesAnimal").fill(notater);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);
}

async function sporFunn(page: Page, tekst: string) {
  const felt = page.getByLabel("Skriv spørsmålet ditt", { exact: true });
  await felt.fill(tekst);
  await page.getByRole("button", { name: "Send spørsmål", exact: true }).click();
  await expect(page.getByText(tekst)).toBeVisible();
  // Vent til svaret er kommet (feltet er aktivt igjen)
  await expect(felt).toBeEnabled();
  await expect(page.getByText("Testsvar fra falsk AI.").last()).toBeVisible();
}

const dialog = (page: Page) => page.getByRole("dialog", { name: "Last ned PDF-rapport" });

async function apneDialog(page: Page) {
  const knapp = page.getByRole("button", { name: "Last ned PDF-rapport" });
  await knapp.scrollIntoViewIfNeeded();
  await knapp.click();
  await expect(dialog(page)).toBeVisible();
}

async function lastNed(page: Page, medSamtale = false): Promise<string> {
  await apneDialog(page);
  if (medSamtale) await dialog(page).getByLabel("Inkluder samtale med Artsorakel").check();
  const [nedlasting] = await Promise.all([page.waitForEvent("download"), dialog(page).getByRole("button", { name: "Last ned rapport" }).click()]);
  await expect(dialog(page)).toHaveCount(0);
  const bytes = new Uint8Array(fs.readFileSync((await nedlasting.path())!));
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  return (await pdfTekst(bytes)).join("\n");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("dialogen: overskrift, avkrysning av som standard, forklaring, og lukking uten nedlasting", async ({ page }) => {
  await analyser(page, 71);
  let nedlastinger = 0;
  page.on("download", () => nedlastinger++);

  await apneDialog(page);
  const d = dialog(page);
  await expect(d.getByRole("heading", { name: "Last ned PDF-rapport" })).toBeVisible();
  const boks = d.getByLabel("Inkluder samtale med Artsorakel");
  await expect(boks).not.toBeChecked();
  await expect(boks).toBeDisabled();
  await expect(d.getByText("Samtalen legges ved som egne sider etter analyserapporten. Kun meldinger knyttet til dette funnet tas med.")).toBeVisible();
  await expect(d.getByText(/Det finnes ingen samtale om dette funnet/)).toBeVisible();

  // Hele dialogen og knappene er synlige på skjermen
  const vindu = page.viewportSize()!;
  const r = (await d.boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.y).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(vindu.width + 0.5);
  expect(r.y + r.height).toBeLessThanOrEqual(vindu.height + 0.5);
  await expect(d.getByRole("button", { name: "Last ned rapport" })).toBeInViewport();
  await expect(d.getByRole("button", { name: "Avbryt" })).toBeInViewport();

  // Tre måter å lukke på – ingen laster ned
  await d.getByRole("button", { name: "Avbryt" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeFocused();
  await apneDialog(page);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await apneDialog(page);
  await dialog(page).getByRole("button", { name: "Lukk" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(nedlastinger).toBe(0);
});

test("PDF uten samtale er som før; med samtale får den vedlegg med riktige meldinger", async ({ page }) => {
  // Generell chat (skal aldri med i rapporten)
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").fill("GENERELL-HEMMELIG krafsing på loftet");
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").press("Enter");
  await expect(chat.getByText(/Krafsing på loftet kan komme fra/)).toBeVisible();
  await chat.getByRole("button", { name: "Lukk chatten" }).click();

  await analyser(page, 72);
  const uten = await lastNed(page);
  expect(uten).not.toContain("Vedlegg – Samtale med Artsorakel");

  await sporFunn(page, "Finnes det flere i veggen? FUNN-A-1");
  await apneDialog(page);
  await expect(dialog(page).getByLabel("Inkluder samtale med Artsorakel")).toBeEnabled();
  await expect(dialog(page).getByLabel("Inkluder samtale med Artsorakel")).not.toBeChecked();
  await dialog(page).getByRole("button", { name: "Avbryt" }).click();

  // Uten avkrysning: fortsatt ingen samtale
  expect(await lastNed(page)).not.toContain("FUNN-A-1");

  const med = await lastNed(page, true);
  const flat = med.replace(/\n/g, " ");
  expect(med).toContain("Vedlegg – Samtale med Artsorakel");
  expect(med).toContain("AI-generert samtale knyttet til dette funnet.");
  expect(flat).toContain(FORBEHOLD);
  expect(med).toMatch(/^Kunde$/m);
  expect(med).toMatch(/^Artsorakel \(AI\)$/m);
  expect(flat).toContain("Finnes det flere i veggen? FUNN-A-1");
  expect(flat).toContain("Testsvar fra falsk AI.");
  expect(flat.indexOf("FUNN-A-1")).toBeLessThan(flat.indexOf("Testsvar fra falsk AI."));
  expect(med).toMatch(/kl\. \d{2}[:.]\d{2}/);
  expect(flat).not.toContain("GENERELL-HEMMELIG");
  expect(flat).not.toContain("Krafsing på loftet");
});

test("ingen lekkasje: ny analyse og funn fra historikken får ikke en annen analyses samtale", async ({ page }) => {
  await analyser(page, 73);
  await sporFunn(page, "Spørsmål om første funn FUNN-A-2");

  // Ny analyse: ingen samtale å legge ved
  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  await analyser(page, 74);
  await apneDialog(page);
  await expect(dialog(page).getByLabel("Inkluder samtale med Artsorakel")).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Avbryt" }).click();
  expect(await lastNed(page)).not.toContain("FUNN-A-2");

  // Det første funnet åpnet fra historikken: samtalen ble ikke lagret, så den kan ikke legges ved
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await historikk.getByRole("button", { name: /^Husmus/ }).last().click();
  await apneDialog(page);
  await expect(dialog(page).getByLabel("Inkluder samtale med Artsorakel")).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Avbryt" }).click();

  // Spør om det historiske funnet nå: bare den nye samtalen tas med
  await sporFunn(page, "Nytt spørsmål om historisk funn FUNN-H-1");
  const tekst = (await lastNed(page, true)).replace(/\n/g, " ");
  expect(tekst).toContain("Miniatyrbilde fra historikken");
  expect(tekst).toContain("FUNN-H-1");
  expect(tekst).not.toContain("FUNN-A-2");
});

test("funn som ikke kunne bestemmes, med samtale", async ({ page }) => {
  await analyser(page, 75, "SKRUE-TEST");
  await expect(page.getByRole("heading", { name: "Ingen skadedyr på bildet", level: 2 })).toBeVisible();
  await sporFunn(page, "Hva kan dette være? FUNN-U-1");
  const tekst = (await lastNed(page, true)).replace(/\n/g, " ");
  expect(tekst).toContain("Ingen skadedyr på bildet");
  expect(tekst).toContain("Vedlegg – Samtale med Artsorakel");
  expect(tekst).toContain("FUNN-U-1");
});

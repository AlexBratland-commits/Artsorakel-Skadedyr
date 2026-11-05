/**
 * H1 (revisjon): motstridende artsnavn gir samme usikre resultat på skjermen,
 * i historikken og i PDF-en; riktig navnepar for pelsbille gir pelsbille.
 * Falsk AI. Feilet på main 02e2c3b og består etter rettelsen.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

const MOTSTRID =
  "AI-en oppga navn som peker på forskjellige arter: «Klatremus» er Klatremus (Myodes glareolus), mens «Myodes rutilus» er Rødmus (Myodes rutilus). Artsorakel velger ikke mellom dem. Bestemmelsen er usikker og bør bekreftes av en fagperson.";

async function analyser(page: Page, seed: number, notat: string) {
  const bilde = await testbilde(seed);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.locator("#notesAnimal").fill(notat);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);
}

async function pdf(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Last ned PDF-rapport" }).click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
  return (await pdfTekst(new Uint8Array(fs.readFileSync((await dl.path())!)))).join(" ").replace(/\s+/g, " ");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("motstridende navn: usikkert på skjermen, i historikken og i PDF-en – ingen art velges", async ({ page }) => {
  await analyser(page, 111, "MOTSTRID-TEST");
  const resultat = page.locator("section[aria-live]");
  await expect(resultat.getByRole("heading", { level: 2, name: "Kunne ikke identifisere funnet sikkert" })).toBeVisible();
  await expect(resultat.getByText(MOTSTRID)).toBeVisible();
  await expect(resultat.getByText("Sikkerhet i bestemmelsen")).toHaveCount(0);
  await expect(resultat.getByText("Kan også være")).toBeVisible();
  await expect(resultat.getByText("Lav sikkerhet")).toHaveCount(2);
  await expect(resultat.getByText("Høy sikkerhet")).toHaveCount(0);

  const tekst = await pdf(page);
  expect(tekst).toContain("Kunne ikke identifisere funnet sikkert");
  expect(tekst).toContain(MOTSTRID);
  expect(tekst).not.toContain("Sikkerhet i bestemmelsen");
  expect(tekst).not.toContain("Høy sikkerhet");

  // Historikken: samme usikre bestemmelse når funnet åpnes igjen
  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("button", { name: /^Ikke identifisert sikkert/ })).toBeVisible();
  await expect(historikk.getByRole("button", { name: /^(Klatremus|Rødmus)/ })).toHaveCount(0);
  await historikk.getByRole("button", { name: /^Ikke identifisert sikkert/ }).click();
  await expect(page.getByText(MOTSTRID)).toBeVisible();
  expect(await pdf(page)).toContain(MOTSTRID);
});

test("riktig navnepar: pelsbille blir pelsbille, ikke brun pelsbille", async ({ page }) => {
  await analyser(page, 112, "PELSBILLE-TEST");
  await expect(page.getByRole("heading", { level: 2, name: "Pelsbille" })).toBeVisible();
  await expect(page.getByText("Attagenus pellio", { exact: true })).toBeVisible();
  await expect(page.getByText(/Brun pelsbille – brune dekkvinger/)).toBeVisible();
  const tekst = await pdf(page);
  expect(tekst).toContain("Pelsbille");
  expect(tekst).toContain("Attagenus pellio");
  expect(tekst).not.toContain("Attagenus smirnovi");
});

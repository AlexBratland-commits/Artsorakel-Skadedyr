/**
 * M9 (revisjon): ekskrementflyten ber aldri brukeren knuse, trykke på eller
 * ta på funnet, og viser FHI-basert veiledning for trygg opprydding.
 * Falsk AI. Feilet på main 2a81de6 og består etter rettelsen.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

const OPPFORDRING = /når du (knuser|trykker)|trykker på (dem|det)|mellom fingrene|(?<!ikke ta på eller )\bknus(e|er)?\b|klem/i;
const OPPRYDDING =
  "Ved opprydding: bruk hansker og munnbind, fukt ekskrementene med såpevann og tørk opp med klut. Ikke fei eller støvsug – det kan virvle opp smittestoffer.";

async function velgEkskrementer(page: Page, seed: number) {
  const bilde = await testbilde(seed);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Ekskrementer" }).click();
  return bilde;
}

const synligTekst = (page: Page) => page.evaluate(() => document.body.innerText);

test("tipset og eksempelteksten ber ikke om å ta på eller trykke", async ({ page }) => {
  const bilde = await velgEkskrementer(page, 101);
  await expect(page.getByText(/Ikke ta på ekskrementene\./)).toBeVisible();
  await expect(page.getByText(/Ta helst et nærbilde med en mynt eller linjal ved siden av\./)).toBeVisible();
  const plassholder = await page.getByLabel(/Beskriv det du ser/).getAttribute("placeholder");
  expect(plassholder).toMatch(/tørre og glinsende, ligger i en haug rett under en sprekk på loftet/);
  expect(plassholder).not.toMatch(OPPFORDRING);
  expect(await synligTekst(page)).not.toMatch(OPPFORDRING);
  slettFil(bilde);
});

test("rotteekskrementer: oppryddingsveiledning på skjermen og i PDF-en, ingen oppfordring til å knuse", async ({ page }) => {
  const bilde = await velgEkskrementer(page, 102);
  await page.getByLabel(/Beskriv det du ser/).fill("Store, i kjelleren ROTTE-TEST");
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /rotte/i }).first()).toBeVisible();
  await expect(page.getByText(OPPRYDDING)).toBeVisible();
  expect(await synligTekst(page)).not.toMatch(OPPFORDRING);

  await page.getByRole("button", { name: "Last ned PDF-rapport" }).click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
  const tekst = (await pdfTekst(new Uint8Array(fs.readFileSync((await dl.path())!)))).join(" ").replace(/\s+/g, " ");
  expect(tekst).toContain(OPPRYDDING);
  expect(tekst).not.toMatch(OPPFORDRING);
  slettFil(bilde);
});

test("grensetilfelle: ukjent ekskrementfunn får også oppryddingsveiledningen", async ({ page }) => {
  const bilde = await velgEkskrementer(page, 103);
  await page.getByLabel(/Beskriv det du ser/).fill("Runde, på loftet UKJENT-TEST");
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Kunne ikke identifisere funnet sikkert" })).toBeVisible();
  await expect(page.getByText(OPPRYDDING)).toBeVisible();
  slettFil(bilde);
});

test("grensetilfelle: bilde av selve dyret får ikke oppryddingsboksen", async ({ page }) => {
  const bilde = await testbilde(104);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  await expect(page.getByText(OPPRYDDING)).toHaveCount(0);
  slettFil(bilde);
});

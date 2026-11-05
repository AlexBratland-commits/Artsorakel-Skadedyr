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
  "AI-en oppga navn som peker på forskjellige arter: «Klatremus» er Klatremus (Myodes glareolus), mens «Myodes rutilus» er Rødmus (Myodes rutilus). Artsorakel velger ikke mellom dem og oppgir ingen sikkerhet for hver av dem. Bestemmelsen er usikker og bør bekreftes av en fagperson.";
const KANDIDATER = ["Klatremus (Myodes glareolus)", "Rødmus (Myodes rutilus)"];
const NIVAA = /(Lav|Middels|Høy) sikkerhet/;

/** Skjermen: motstrid-boksen med begge mulige arter, uten sikkerhet. */
async function sjekkMotstridSkjerm(page: Page) {
  const resultat = page.locator("section[aria-live]");
  await expect(resultat.getByRole("heading", { level: 2, name: "Kunne ikke identifisere funnet sikkert" })).toBeVisible();
  await expect(resultat.getByRole("heading", { level: 3, name: "Analysen inneholder motstridende artsnavn" })).toBeVisible();
  await expect(resultat.getByText(MOTSTRID)).toBeVisible();
  await expect(resultat.getByText("Mulige arter (ingen sikkerhet oppgitt)")).toBeVisible();
  for (const k of KANDIDATER) await expect(resultat.getByRole("listitem").filter({ hasText: k })).toBeVisible();
  await expect(resultat.getByText("Sikkerhet i bestemmelsen")).toHaveCount(0);
  await expect(resultat.getByText("Kan også være")).toHaveCount(0);
  await expect(resultat.getByText(NIVAA)).toHaveCount(0);
}

function sjekkMotstridPdf(tekst: string) {
  expect(tekst).toContain("Kunne ikke identifisere funnet sikkert");
  expect(tekst).toContain("Analysen inneholder motstridende artsnavn");
  expect(tekst).toContain(MOTSTRID);
  expect(tekst).toContain("Mulige arter (ingen sikkerhet oppgitt)");
  for (const k of KANDIDATER) expect(tekst).toContain(k);
  expect(tekst).not.toContain("Sikkerhet i bestemmelsen");
  expect(tekst).not.toMatch(NIVAA);
}

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
  await sjekkMotstridSkjerm(page);
  sjekkMotstridPdf(await pdf(page));

  // Historikken: samme usikre bestemmelse når funnet åpnes igjen
  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("button", { name: /^Ikke identifisert sikkert/ })).toBeVisible();
  await expect(historikk.getByRole("button", { name: /^(Klatremus|Rødmus)/ })).toHaveCount(0);
  await historikk.getByRole("button", { name: /^Ikke identifisert sikkert/ }).click();
  await sjekkMotstridSkjerm(page);
  sjekkMotstridPdf(await pdf(page));
});

test("art utenfor listen med motstridende navn: samme usikre visning", async ({ page }) => {
  await analyser(page, 113, "ANNEN-MOTSTRID-TEST");
  await sjekkMotstridSkjerm(page);
  await expect(page.getByText(/Ikke i Ocabs database/)).toHaveCount(0);
  sjekkMotstridPdf(await pdf(page));
});

test("generelt navn alene: «Mulig Husmus» med lav sikkerhet på skjermen, i historikken og i PDF-en", async ({ page }) => {
  await analyser(page, 114, "GENERELL-TEST");
  const resultat = page.locator("section[aria-live]");
  await expect(resultat.getByRole("heading", { level: 2, name: "Mulig Husmus" })).toBeVisible();
  await expect(resultat.getByText(/generelle navnet «Mus», som kan gjelde flere arter/)).toBeVisible();
  await expect(resultat.getByText("Lav sikkerhet", { exact: true })).toBeVisible();
  const tekst = await pdf(page);
  expect(tekst).toContain("Mulig Husmus");
  expect(tekst).toContain("Sikkerhet i bestemmelsen: Lav sikkerhet");
  expect(tekst).toContain("generelle navnet «Mus»");

  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("button", { name: /^Mulig Husmus/ })).toBeVisible();
  await expect(historikk.getByRole("button", { name: /^Mulig Husmus/ })).toContainText("Lav sikkerhet");
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

test("«Kakerlakk» + Periplaneta americana: amerikansk kakerlakk, ingen motstrid", async ({ page }) => {
  await analyser(page, 115, "KAKERLAKK-TEST");
  await expect(page.getByRole("heading", { level: 2, name: "Amerikansk kakerlakk" })).toBeVisible();
  await expect(page.getByText("Analysen inneholder motstridende artsnavn")).toHaveCount(0);
  const tekst = await pdf(page);
  expect(tekst).toContain("Amerikansk kakerlakk");
  expect(tekst).not.toContain("Tysk kakerlakk –");
});

test("«Kakerlakk» + Ectobius lapponicus (markkakerlakk): art utenfor listen, ikke tysk kakerlakk", async ({ page }) => {
  await analyser(page, 116, "MARKKAKERLAKK-TEST");
  await expect(page.getByRole("heading", { level: 2, name: "Mulig Kakerlakk" })).toBeVisible();
  await expect(page.getByText(/Ikke i Ocabs database/)).toBeVisible();
  await expect(page.getByText(/Tysk kakerlakk|Ikke sprøyt selv|Meld fra til huseier/)).toHaveCount(0);
  const tekst = await pdf(page);
  expect(tekst).toContain("Ectobius lapponicus");
  expect(tekst).not.toMatch(/Tysk kakerlakk|Ikke sprøyt selv|Bør håndteres raskt/);
});

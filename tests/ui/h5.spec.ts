/**
 * H5 (revisjon): et uklart bilde vises aldri med høy sikkerhet – modellen
 * sa 92 og «uklart»; skjermen, PDF-en og historikken viser «Lav» med samme
 * forklaring. Ingen prosenter vises. Falsk AI. Feilet på main 1ad3fd3.
 */
import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

const FORKLARING = "Bildet er uklart, så sikkerheten er satt ned.";

test("uklart bilde: Lav sikkerhet og forklaring på skjermen, i PDF-en og i historikken", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const bilde = await testbilde(141);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.locator("#notesAnimal").fill("UKLART-TEST");
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);

  const resultat = page.locator("section[aria-live]");
  await expect(resultat.getByRole("heading", { level: 2, name: "Mulig Husmus" })).toBeVisible();
  await expect(resultat.getByRole("meter")).toHaveAttribute("aria-valuetext", "Lav sikkerhet");
  await expect(resultat.getByText(FORKLARING)).toBeVisible();
  await expect(resultat).not.toContainText(/\d+ ?%/);

  await page.getByRole("button", { name: "Last ned PDF-rapport" }).click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
  const pdf = (await pdfTekst(new Uint8Array(fs.readFileSync((await dl.path())!)))).join(" ").replace(/\s+/g, " ");
  expect(pdf).toContain("Sikkerhet i bestemmelsen: Lav sikkerhet");
  expect(pdf).toContain(FORKLARING);
  expect(pdf).not.toContain("Høy sikkerhet");

  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("button", { name: /^Mulig Husmus/ })).toContainText("Lav sikkerhet");
});

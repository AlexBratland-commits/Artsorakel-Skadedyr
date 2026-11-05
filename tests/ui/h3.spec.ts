/**
 * H3 (revisjon), punkt 6: «Mulig Kakerlakk» (art utenfor listen, Ectobius
 * lapponicus) viste «høy sikkerhet» på skjermen, men «Meld fra om feil
 * bestemmelse» sa «lav» og «modellens tall: 0». Nå samme nivå og tall på
 * skjermen, i e-posten, i historikken og i PDF-en. Falsk AI.
 * Feilet på main 6541875 og består etter rettelsen.
 */
import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

test("art utenfor listen: samme sikkerhet på skjermen, i e-posten, i historikken og i PDF-en", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const bilde = await testbilde(121);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.locator("#notesAnimal").fill("MARKKAKERLAKK-TEST");
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  slettFil(bilde);

  const resultat = page.locator("section[aria-live]");
  await expect(resultat.getByRole("heading", { level: 2, name: "Mulig Kakerlakk" })).toBeVisible();
  await expect(resultat.getByText(/Ikke i Ocabs database – forslaget kommer fra AI-en alene\s*\(høy sikkerhet\)/)).toBeVisible();

  const href = (await page.getByRole("link", { name: "Meld fra om feil bestemmelse" }).getAttribute("href"))!;
  const epost = decodeURIComponent(href.split("body=")[1]);
  expect(epost).toContain("Appen foreslo Mulig Kakerlakk (Ectobius lapponicus) – ikke i databasen, sikkerhet: høy sikkerhet (tall i analysen: 92).");
  expect(epost).not.toMatch(/lav sikkerhet|modellens tall: 0/);

  await page.getByRole("button", { name: "Last ned PDF-rapport" }).click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
  const pdf = (await pdfTekst(new Uint8Array(fs.readFileSync((await dl.path())!)))).join(" ").replace(/\s+/g, " ");
  expect(pdf).toContain("(høy sikkerhet)");
  expect(pdf).not.toContain("Lav sikkerhet");

  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("button", { name: /^Mulig Kakerlakk/ })).toContainText("Høy sikkerhet");
});

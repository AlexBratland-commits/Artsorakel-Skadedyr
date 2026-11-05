/**
 * Chatboblen på mobil (iPhone SE og iPhone 13, lys og mørk modus): alltid
 * synlig og fast nede til høyre – den viker ikke for knapper, så siden har
 * luft nederst. PDF-rapporten kan lastes ned etter en analyse.
 * Falsk AI – ingen ekte AI-kall.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

/** Boblen er synlig, 52 × 52 og ikke skjult. */
async function synligBoble(page: Page) {
  const boble = page.getByRole("button", { name: "Spør Artsorakel" });
  await expect(boble).toBeVisible();
  await expect(boble).toHaveAttribute("data-modus", "kompakt");
  await expect(boble).toHaveCSS("opacity", "1");
  const r = (await boble.boundingBox())!;
  expect([Math.round(r.width), Math.round(r.height)]).toEqual([52, 52]);
}

/** Scroll gjennom hele siden og sjekk at boblen er synlig i hvert steg. */
async function sjekkHeleSiden(page: Page) {
  const hoyde = await page.evaluate(() => document.documentElement.scrollHeight);
  const vindu = page.viewportSize()!.height;
  for (let y = 0; y <= hoyde; y += Math.round(vindu / 3)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await synligBoble(page);
  }
}

for (const tema of ["light", "dark"] as const) {
  test(`chatboblen er alltid synlig på forsiden og kan åpnes (${tema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Velg fra bilder" })).toBeVisible();
    await sjekkHeleSiden(page);
    const boble = page.getByRole("button", { name: "Spør Artsorakel" });
    await boble.click();
    await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toBeVisible();
  });
}

test("med åpent tastatur er boblen fortsatt synlig og på samme plass", async ({ page }) => {
  const bilde = await testbilde(61);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  const boble = page.getByRole("button", { name: "Spør Artsorakel" });
  const foer = (await boble.boundingBox())!;
  await page.locator("#notesAnimal").focus();
  await synligBoble(page);
  const under = (await boble.boundingBox())!;
  expect([under.x, under.y]).toEqual([foer.x, foer.y]);
  slettFil(bilde);
});

test("PDF-rapport etter analyse: knappen er synlig og ikke dekket, og PDF-en har riktig innhold", async ({ page }) => {
  const bilde = await testbilde(62);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();

  const knapp = page.getByRole("button", { name: "Last ned PDF-rapport" });
  await sjekkHeleSiden(page);

  // Knappen kan nås og trykkes på (Playwright klikker bare når ingenting ligger over den)
  await knapp.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await knapp.click();
  const [nedlasting] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
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
  await page.getByRole("button", { name: "Last ned PDF-rapport" }).click();
  const [nedlasting] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
  const tekst = (await pdfTekst(new Uint8Array(fs.readFileSync((await nedlasting.path())!)))).join(" ").replace(/\n/g, " ");
  expect(tekst).toContain("Miniatyrbilde fra historikken");
  slettFil(bilde);
});

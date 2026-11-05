/**
 * Regresjonstester for funn fra den uavhengige revisjonen (main 199dc5e):
 * H2 (sent analysesvar overtar et annet funn), L1 (ødelagt lokal lagring),
 * L2 (chatboblens punktsøk), L4 (mobilchat) og M3 (sterkere alternativ på
 * skjermen). Falsk AI. Feilet på 199dc5e og består etter rettelsen.
 */
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { pdfTekst } from "../helpers/pdf-tekst";
import { slettFil, testbilde } from "./helpers";

const historikk = (page: Page) => page.getByRole("region", { name: "Tidligere bilder på denne enheten" });

async function lastNedPdf(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Last ned PDF-rapport" }).click();
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("dialog", { name: "Last ned PDF-rapport" }).getByRole("button", { name: "Last ned rapport" }).click(),
  ]);
  return (await pdfTekst(new Uint8Array(fs.readFileSync((await dl.path())!)))).join(" ").replace(/\n/g, " ");
}

test("H2: et sent analysesvar overtar ikke et funn som er åpnet fra historikken", async ({ page }) => {
  const thumbB =
    "data:image/jpeg;base64," +
    (await sharp({ create: { width: 40, height: 40, channels: 3, background: "#cc2200" } }).jpeg().toBuffer()).toString("base64");
  const B = {
    id: "b", tid: "2026-11-01T10:00:00.000Z", thumb: thumbB, sted: "loft", artsdata: 2,
    resultat: { found: true, name: "Testart B", latinName: "Testus b", description: "B-beskrivelse", severity: "lav", fhiSlug: "x", confidence: 90, tiltak: ["B-tiltak"], alternativer: [], fhiUrl: "https://www.fhi.no/" },
  };
  await page.goto("/");
  await page.evaluate((b) => localStorage.setItem("ocab-skadedyr-historikk", JSON.stringify([b])), B);
  await page.reload();
  // Analysen av A tar tid
  await page.route("**/api/analyze", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });

  const bilde = await testbilde(81);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await page.waitForTimeout(300);
  await historikk(page).getByRole("button", { name: /^Testart B/ }).click();
  await expect(page.getByRole("heading", { name: "Testart B", level: 2 })).toBeVisible();

  // A blir ferdig mens B vises – A havner i historikken, men B blir stående
  await expect(historikk(page).getByRole("button", { name: /^Husmus/ })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500);
  await expect(page.getByRole("heading", { name: "Testart B", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toHaveCount(0);
  expect(await page.locator("#bildeopplasting img").first().getAttribute("src")).toBe(thumbB);

  // PDF for det som vises (B) inneholder bare B
  const pdfB = await lastNedPdf(page);
  expect(pdfB).toContain("Testart B");
  expect(pdfB).not.toContain("Husmus");

  // A kan åpnes fra historikken, med eget bilde og egen PDF
  await historikk(page).getByRole("button", { name: /^Husmus/ }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  expect(await page.locator("#bildeopplasting img").first().getAttribute("src")).not.toBe(thumbB);
  const pdfA = await lastNedPdf(page);
  expect(pdfA).toContain("Husmus");
  expect(pdfA).not.toContain("Testart B");
  slettFil(bilde);
});

test("L1: ødelagt historikk og chatlagring krasjer ikke siden", async ({ page }) => {
  const feil: string[] = [];
  page.on("pageerror", (e) => feil.push(e.message));
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("ocab-skadedyr-historikk", JSON.stringify([null, { id: 1 }, "x"]));
    localStorage.setItem("artsorakel-assistent", JSON.stringify({ meldinger: [null, { role: "user" }, { role: "ondsinnet", content: "x" }] }));
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Velg fra bilder" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toBeVisible();
  expect(feil).toEqual([]);
});

test("L2: chatboblen bruker ikke tusenvis av punktsøk når den flytter seg", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __punktsok: number };
    w.__punktsok = 0;
    const orig = document.elementsFromPoint.bind(document);
    document.elementsFromPoint = (x: number, y: number) => {
      w.__punktsok++;
      return orig(x, y);
    };
  });
  const bilde = await testbilde(82);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("button", { name: "Last ned PDF-rapport" })).toBeVisible();
  await page.evaluate(() => ((window as unknown as { __punktsok: number }).__punktsok = 0));
  const hoyde = await page.evaluate(() => document.documentElement.scrollHeight);
  const t0 = Date.now();
  for (let y = 0; y <= hoyde; y += 120) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(40);
  }
  const sok = await page.evaluate(() => (window as unknown as { __punktsok: number }).__punktsok);
  console.log(`punktsøk under scrolling: ${sok} (${Date.now() - t0} ms)`);
  expect(sok).toBeLessThan(200);
  slettFil(bilde);
});

test("L4: funn-chatten zoomer ikke på iPhone, og mobilchatten holder fokus", async ({ page }) => {
  const bilde = await testbilde(83);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  // iOS Safari zoomer inn på felt med skrift under 16 px
  const storrelse = await page.getByLabel("Skriv spørsmålet ditt", { exact: true }).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(storrelse).toBeGreaterThanOrEqual(16);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await expect(chat).toHaveAttribute("aria-modal", "true");
  // Tab går rundt inne i chatten
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    expect(await chat.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(chat).toHaveCount(0);
  slettFil(bilde);
});

test("M3: et alternativ som er minst like sannsynlig, vises med nivå og merknad", async ({ page }) => {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        found: true, name: "Husmus", latinName: "Mus musculus", description: "x", severity: "middels", fhiSlug: "mus", confidence: 80, gruppe: "Gnagere",
        tiltak: ["t"], fhiUrl: "https://www.fhi.no/",
        alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 99, hvorfor: "Kraftig hale" }],
      }),
    })
  );
  const bilde = await testbilde(84);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  const alt = page.getByRole("listitem").filter({ hasText: "Brunrotte" });
  await expect(alt).toContainText("Høy sikkerhet");
  await expect(page.getByText(/minst like sannsynlig/)).toBeVisible();
  slettFil(bilde);
});

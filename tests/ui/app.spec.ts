import { expect, test } from "@playwright/test";
import { fangFeil, slettFil, testbilde } from "./helpers";

test("siden lastes med sikkerhetsheadere og uten CSP-feil", async ({ page }) => {
  const feil = fangFeil(page);
  const res = await page.goto("/");
  const h = res!.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-powered-by"]).toBeUndefined();
  await expect(page.getByRole("heading", { name: "Hva er det du har funnet?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ta bilde" })).toBeVisible();
  // Gi skript og stiler tid til å laste, og sjekk at CSP ikke blokkerte noe.
  await page.waitForLoadState("networkidle");
  expect(feil.filter((f) => /Content Security Policy|Refused to/i.test(f))).toEqual([]);
  expect(feil).toEqual([]);
});

test("hele flyten: bilde → resultat → spørsmål → oppfølgingsspørsmål", async ({ page }) => {
  const feil = fangFeil(page);
  const bilde = await testbilde(1);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByLabel("Hvor fant du det?").selectOption("kjeller");
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();

  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  await expect(page.getByText("Mus musculus").first()).toBeVisible();
  await expect(page.getByText("Høy sikkerhet").first()).toBeVisible();
  await expect(page.getByText("Brunrotte").first()).toBeVisible(); // alternativet

  // Chat med billett og signert historikk
  await page.getByRole("button", { name: "Er den farlig?" }).click();
  await expect(page.getByText("Testsvar fra falsk AI.")).toHaveCount(1);
  await page.getByLabel("Skriv spørsmålet ditt").fill("Hvordan tetter jeg?");
  await page.getByRole("button", { name: "Send spørsmål" }).click();
  await expect(page.getByText("Testsvar fra falsk AI.")).toHaveCount(2);

  // Historikken på enheten er oppdatert
  await expect(page.getByRole("heading", { name: "Tidligere bilder på denne enheten" })).toBeVisible();
  expect(feil).toEqual([]);
  slettFil(bilde);
});

test("uten dekning vises en norsk feilmelding (ikke «Failed to fetch»)", async ({ page }) => {
  const bilde = await testbilde(2);
  await page.goto("/");
  await page.route("**/api/analyze", (route) => route.abort("internetdisconnected"));
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByText("Fikk ikke kontakt med Artsorakel. Sjekk nettforbindelsen og prøv igjen.")).toBeVisible();
  // Knappen er tilgjengelig igjen, så brukeren kan prøve på nytt
  await expect(page.getByRole("button", { name: "Artsbestem bildet" })).toBeEnabled();
  slettFil(bilde);
});

test("personvernsiden finnes og lenkes fra forsiden", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Personvern" }).click();
  await expect(page.getByRole("heading", { name: "Personvern i Artsorakel" })).toBeVisible();
});
